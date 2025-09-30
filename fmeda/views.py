from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Project, SafetyFunction, Component, FailureMode
from .serializers import ProjectSerializer, SafetyFunctionSerializer, ComponentSerializer, FailureModeSerializer
from .utils import calculate_fmeda_metrics, update_failure_mode_calculations
from rest_framework.parsers import MultiPartParser
from django.http import HttpResponse
import pandas as pd

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    def create(self, request, *args, **kwargs):
        # Clear any existing data for this project name if it exists
        project_name = request.data.get('name')
        if project_name:
            print(f"Creating new project: {project_name}")
            
            # Delete ALL existing projects and their data completely
            print("Deleting ALL existing projects and data...")
            
            # Delete in reverse dependency order to avoid foreign key constraints
            FailureMode.objects.all().delete()
            Component.objects.all().delete()
            SafetyFunction.objects.all().delete()
            Project.objects.all().delete()
            
            print("All existing data cleared successfully")
        
        return super().create(request, *args, **kwargs)

class SafetyFunctionViewSet(viewsets.ModelViewSet):
    queryset = SafetyFunction.objects.all()
    serializer_class = SafetyFunctionSerializer

class ComponentViewSet(viewsets.ModelViewSet):
    queryset = Component.objects.all()
    serializer_class = ComponentSerializer

    def create(self, request, *args, **kwargs):
        print(f"ComponentViewSet.create called with data: {request.data}")
        related_sfs_ids = request.data.get('related_sfs', [])
        print(f"related_sfs_ids: {related_sfs_ids}")
        serializer = self.get_serializer(data=request.data, context={'related_sfs': related_sfs_ids})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        related_sfs_ids = request.data.get('related_sfs', [])
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'related_sfs': related_sfs_ids})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

class FailureModeViewSet(viewsets.ModelViewSet):
    queryset = FailureMode.objects.all()
    serializer_class = FailureModeSerializer

    def create(self, request, *args, **kwargs):
        print(f"FailureModeViewSet.create called with data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        print(f"Created failure mode: {serializer.data}")
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        print(f"FailureModeViewSet.update called with data: {request.data}")
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        print(f"Updated failure mode: {serializer.data}")
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-component/(?P<component_id>[^/.]+)')
    def by_component(self, request, component_id=None):
        """Get all failure modes for a specific component"""
        print(f"by_component called with component_id: {component_id} (type: {type(component_id)})")
        try:
            # Convert component_id to integer if it's a string
            if isinstance(component_id, str):
                component_id = int(component_id)
            
            component = Component.objects.get(id=component_id)
            print(f"Found component: {component.comp_id} (ID: {component.id})")
            failure_modes = FailureMode.objects.filter(component=component)
            print(f"Found {failure_modes.count()} failure modes for component {component_id}")
            for fm in failure_modes:
                print(f"  - {fm.description} (ID: {fm.id})")
            serializer = self.get_serializer(failure_modes, many=True)
            return Response(serializer.data)
        except Component.DoesNotExist:
            print(f"Component with ID {component_id} not found")
            return Response({'detail': 'Component not found.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            print(f"Invalid component ID format: {component_id}")
            return Response({'detail': 'Invalid component ID format.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error getting failure modes for component {component_id}: {e}")
            return Response({'detail': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Placeholder for FMEDA calculation endpoint
from rest_framework.views import APIView
class FMEDACalculateView(APIView):
    def post(self, request, *args, **kwargs):
        project_id = request.data.get('project')
        if not project_id:
            return Response({'detail': 'project is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        print(f"FMEDA Calculation for Project: {project.name} (ID: {project.id})")
        print(f"Project has {project.safety_functions.count()} Safety Functions")
        print(f"Project has {project.components.count()} Components")
        
        # Debug: Check component-safety function relationships
        for comp in project.components.all():
            print(f"Component {comp.comp_id}: related_sfs = {[sf.sf_id for sf in comp.related_sfs.all()]}")
        
        # Update all FailureModes for all components in the project
        for comp in project.components.all():
            print(f"Processing Component: {comp.comp_id} with {comp.failure_modes.count()} failure modes")
            for fm in comp.failure_modes.all():
                update_failure_mode_calculations(fm)
        
        # Update all SafetyFunctions
        for sf in project.safety_functions.all():
            print(f"Processing Safety Function: {sf.sf_id}")
            calculate_fmeda_metrics(sf, float(project.lifetime))
        
        # Return results for each safety function
        results = []
        for sf in project.safety_functions.all():
            result = {
                'safety_function': sf.id,
                'sf_id': sf.sf_id,
                'spfm': sf.SPFM * 100 if sf.SPFM else 0,
                'lfm': sf.LFM * 100 if sf.LFM else 0,
                'mphf': sf.MPHF,
                'rf': sf.RF,
                'mpfl': sf.MPFL,
                'mpfd': sf.MPFD,
                'safetyrelated': sf.safetyrelated
            }
            results.append(result)
            print(f"Result for {sf.sf_id}: SPFM={result['spfm']}, LFM={result['lfm']}, MPHF={result['mphf']}")
        
        print(f"Returning {len(results)} results")
        return Response(results, status=status.HTTP_200_OK)

class ProjectResultsView(APIView):
    def get(self, request, project_id, *args, **kwargs):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Return results for each safety function
        results = []
        for sf in project.safety_functions.all():
            results.append({
                'safety_function': sf.id,
                'sf_id': sf.sf_id,
                'spfm': sf.SPFM * 100 if sf.SPFM else 0,
                'lfm': sf.LFM * 100 if sf.LFM else 0,
                'mphf': sf.MPHF,
                'rf': sf.RF,
                'mpfl': sf.MPFL,
                'mpfd': sf.MPFD,
                'safetyrelated': sf.safetyrelated
            })
        
        return Response(results, status=status.HTTP_200_OK)

class ProjectImportCSVView(APIView):
    parser_classes = [MultiPartParser]
    http_method_names = ['post']  # Only allow POST method
    
    def post(self, request, *args, **kwargs):
        print("=== ProjectImportCSVView.post called ===")
        print(f"Request method: {request.method}")
        print(f"Request path: {request.path}")
        print(f"Request FILES: {request.FILES}")
        print(f"Request data: {request.data}")
        
        file_obj = request.FILES.get('file')
        if not file_obj:
            print("No file uploaded")
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            print(f"Importing file: {file_obj.name}")
            df = pd.read_csv(file_obj)
            print(f"CSV columns: {df.columns.tolist()}")
            print(f"CSV shape: {df.shape}")
            print(f"First few rows:")
            print(df.head())
            
            # Clear ALL existing data before importing new project
            print("=== Clearing existing data before import ===")
            FailureMode.objects.all().delete()
            Component.objects.all().delete()
            SafetyFunction.objects.all().delete()
            Project.objects.all().delete()
            print("Successfully cleared all existing data")
            
            # Create new project
            project_row = df[df['section'] == 'project'].iloc[0]
            print(f"Project row: {project_row.to_dict()}")
            project = Project.objects.create(
                name=project_row['name'],
                lifetime=float(project_row['lifetime']) if pd.notna(project_row['lifetime']) else 0
            )
            print(f"Created project: {project.name} (ID: {project.id})")
            
            sf_map = {}
            for _, row in df[df['section'] == 'sf'].iterrows():
                print(f"Creating SF: {row.to_dict()}")
                sf = SafetyFunction.objects.create(
                    project=project,
                    sf_id=str(row['id']) if pd.notna(row['id']) else '',
                    description=row.get('description', ''),
                    target_integrity_level=row.get('target_integrity_level', '')
                )
                sf_map[sf.sf_id] = sf
                print(f"Created SF: {sf.sf_id}")
            
            comp_map = {}
            for _, row in df[df['section'] == 'component'].iterrows():
                print(f"Creating component: {row.to_dict()}")
                
                # Convert component ID to string and handle float values
                comp_id = str(row['id']) if pd.notna(row['id']) else ''
                
                # Determine if component is safety related based on related_sf_ids or explicit field
                is_safety_related = False
                if pd.notna(row.get('related_sf_ids', '')) and str(row.get('related_sf_ids', '')).strip():
                    is_safety_related = True
                elif pd.notna(row.get('is_safety_related', '')):
                    is_safety_related = bool(row.get('is_safety_related'))
                
                comp = Component.objects.create(
                    project=project,
                    comp_id=comp_id,
                    type=row.get('type', ''),
                    failure_rate=float(row['failure_rate']) if pd.notna(row['failure_rate']) else 0,
                    is_safety_related=is_safety_related
                )
                comp_map[comp.comp_id] = comp
                print(f"Created component: {comp.comp_id} (safety_related: {is_safety_related})")
            
            for _, row in df[df['section'] == 'fm'].iterrows():
                print(f"Creating FM: {row.to_dict()}")
                comp_id = str(row['component_id']) if pd.notna(row['component_id']) else ''
                comp = comp_map.get(comp_id)
                if comp:
                    fm = FailureMode.objects.create(
                        component=comp,
                        description=row.get('description', ''),
                        Failure_rate_total=float(row.get('Failure_rate_total', 0)),
                        system_level_effect=row.get('system_level_effect', ''),
                        is_SPF=int(float(row.get('is_SPF', 0))) if pd.notna(row.get('is_SPF', 0)) else 0,
                        is_MPF=int(float(row.get('is_MPF', 0))) if pd.notna(row.get('is_MPF', 0)) else 0,
                        SPF_safety_mechanism=row.get('SPF_safety_mechanism', ''),
                        SPF_diagnostic_coverage=float(row.get('SPF_diagnostic_coverage', 0)),
                        MPF_safety_mechanism=row.get('MPF_safety_mechanism', ''),
                        MPF_diagnostic_coverage=float(row.get('MPF_diagnostic_coverage', 0)),
                    )
                    # Calculate FM metrics
                    update_failure_mode_calculations(fm)
                    print(f"Created FM for component {comp_id}")
                else:
                    print(f"Warning: Component {comp_id} not found for FM. Available components: {list(comp_map.keys())}")
            
            # Link related_sfs for components
            print(f"=== Linking components to safety functions ===")
            print(f"Available safety functions in sf_map: {list(sf_map.keys())}")
            
            for _, row in df[df['section'] == 'component'].iterrows():
                comp_id = str(row['id']) if pd.notna(row['id']) else ''
                comp = comp_map.get(comp_id)
                if comp and pd.notna(row.get('related_sf_ids', '')) and str(row.get('related_sf_ids', '')).strip():
                    # Handle different possible formats of related_sf_ids
                    related_sf_ids_raw = str(row.get('related_sf_ids', '')).strip()
                    print(f"Raw related_sf_ids for component {comp.comp_id}: '{related_sf_ids_raw}'")
                    
                    # Split by comma and clean up each ID
                    sf_ids = []
                    if related_sf_ids_raw:
                        # Split by comma and clean up
                        sf_ids = [s.strip() for s in related_sf_ids_raw.split(',') if s.strip()]
                        print(f"Parsed SF IDs for component {comp.comp_id}: {sf_ids}")
                    
                    # Link each safety function
                    linked_count = 0
                    for sfid in sf_ids:
                        sf = sf_map.get(sfid)
                        if sf:
                            comp.related_sfs.add(sf)
                            linked_count += 1
                            print(f"Linked {comp.comp_id} to {sf.sf_id}")
                        else:
                            print(f"Warning: SF {sfid} not found in sf_map. Available SFs: {list(sf_map.keys())}")
                    
                    print(f"Successfully linked {linked_count} safety functions to component {comp.comp_id}")
                elif comp:
                    print(f"No related_sf_ids found for component {comp.comp_id}")
                else:
                    print(f"Component {comp_id} not found in comp_map. Available components: {list(comp_map.keys())}")
            
            # Calculate SF metrics
            for sf in project.safety_functions.all():
                calculate_fmeda_metrics(sf, project.lifetime)
                print(f"Calculated metrics for SF: {sf.sf_id}")
            
            serializer = ProjectSerializer(project)
            print(f"Import completed successfully for project: {project.name}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Import failed with error: {e}")
            import traceback
            traceback.print_exc()
            return Response({'detail': f'Import failed: {e}'}, status=status.HTTP_400_BAD_REQUEST)

class ProjectExportCSVView(APIView):
    def get(self, request, project_id, *args, **kwargs):
        try:
            project = Project.objects.get(id=project_id)
            rows = []
            rows.append({'section': 'project', 'name': project.name, 'lifetime': project.lifetime})
            for sf in project.safety_functions.all():
                rows.append({
                    'section': 'sf',
                    'id': sf.sf_id,
                    'description': sf.description,
                    'target_integrity_level': sf.target_integrity_level,
                    'RF': sf.RF,
                    'MPFL': sf.MPFL,
                    'MPFD': sf.MPFD,
                    'MPHF': sf.MPHF,
                    'SPFM': sf.SPFM,
                    'LFM': sf.LFM,
                    'safetyrelated': sf.safetyrelated
                })
            for comp in project.components.all():
                related_sf_ids = ','.join([sf.sf_id for sf in comp.related_sfs.all()])
                rows.append({
                    'section': 'component', 
                    'id': comp.comp_id, 
                    'type': comp.type, 
                    'failure_rate': comp.failure_rate, 
                    'related_sf_ids': related_sf_ids,
                    'is_safety_related': comp.is_safety_related
                })
            for comp in project.components.all():
                for fm in comp.failure_modes.all():
                    rows.append({'section': 'fm', 'component_id': comp.comp_id, 'description': fm.description, 'Failure_rate_total': fm.Failure_rate_total, 'system_level_effect': fm.system_level_effect, 'is_SPF': fm.is_SPF, 'SPF_safety_mechanism': fm.SPF_safety_mechanism, 'SPF_diagnostic_coverage': fm.SPF_diagnostic_coverage, 'is_MPF': fm.is_MPF, 'MPF_safety_mechanism': fm.MPF_safety_mechanism, 'MPF_diagnostic_coverage': fm.MPF_diagnostic_coverage})
            df = pd.DataFrame(rows)
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{project.name}_fmeda.csv"'
            df.to_csv(response, index=False)
            return response
        except Exception as e:
            return Response({'detail': f'Export failed: {e}'}, status=status.HTTP_400_BAD_REQUEST) 

class ProjectDebugView(APIView):
    def get(self, request, project_id, *args, **kwargs):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        debug_data = {
            'project': {
                'id': project.id,
                'name': project.name,
                'lifetime': project.lifetime
            },
            'safety_functions': [],
            'components': []
        }
        
        for sf in project.safety_functions.all():
            sf_data = {
                'id': sf.id,
                'sf_id': sf.sf_id,
                'description': sf.description,
                'target_integrity_level': sf.target_integrity_level,
                'related_components': [comp.comp_id for comp in sf.related_components.all()],
                'metrics': {
                    'SPFM': sf.SPFM,
                    'LFM': sf.LFM,
                    'MPHF': sf.MPHF,
                    'RF': sf.RF,
                    'MPFL': sf.MPFL,
                    'MPFD': sf.MPFD,
                    'safetyrelated': sf.safetyrelated
                }
            }
            debug_data['safety_functions'].append(sf_data)
        
        for comp in project.components.all():
            comp_data = {
                'id': comp.id,
                'comp_id': comp.comp_id,
                'type': comp.type,
                'failure_rate': comp.failure_rate,
                'is_safety_related': comp.is_safety_related,
                'related_sfs': [sf.sf_id for sf in comp.related_sfs.all()],
                'failure_modes': []
            }
            
            for fm in comp.failure_modes.all():
                fm_data = {
                    'id': fm.id,
                    'description': fm.description,
                    'Failure_rate_total': fm.Failure_rate_total,
                    'is_SPF': fm.is_SPF,
                    'is_MPF': fm.is_MPF,
                    'SPF_diagnostic_coverage': fm.SPF_diagnostic_coverage,
                    'MPF_diagnostic_coverage': fm.MPF_diagnostic_coverage,
                    'RF': fm.RF,
                    'MPFL': fm.MPFL,
                    'MPFD': fm.MPFD
                }
                comp_data['failure_modes'].append(fm_data)
            
            debug_data['components'].append(comp_data)
        
        return Response(debug_data, status=status.HTTP_200_OK) 

class ProjectClearAllView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            # Clear all projects and related data
            print("Clearing ALL projects and data...")
            
            # Delete all data in reverse dependency order
            FailureMode.objects.all().delete()
            Component.objects.all().delete()
            SafetyFunction.objects.all().delete()
            Project.objects.all().delete()
            
            print("Successfully cleared all projects and data")
            return Response({'detail': 'All projects and data cleared successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error clearing data: {e}")
            return Response({'detail': f'Error clearing data: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 