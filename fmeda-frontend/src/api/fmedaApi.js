// localStorage-based FMEDA API - No backend required!
// All data is stored in the browser's localStorage

// Storage keys
const STORAGE_KEYS = {
  PROJECTS: 'fmeda_projects',
  SAFETY_FUNCTIONS: 'fmeda_safety_functions',
  COMPONENTS: 'fmeda_components',
  FAILURE_MODES: 'fmeda_failure_modes',
  NEXT_ID: 'fmeda_next_id'
};

// Helper to generate unique IDs
const getNextId = () => {
  const currentId = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_ID) || '1');
  localStorage.setItem(STORAGE_KEYS.NEXT_ID, String(currentId + 1));
  return currentId;
};

// Helper to get/set data from localStorage
const getStorageData = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return [];
  }
};

const setStorageData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    throw error;
  }
};

// ==================== Projects API ====================

export const getProjects = async () => {
  return getStorageData(STORAGE_KEYS.PROJECTS);
};

export const createProject = async (projectData) => {
  const projects = getStorageData(STORAGE_KEYS.PROJECTS);
  const newProject = {
    id: getNextId(),
    name: projectData.name || 'Untitled Project',
    lifetime: projectData.lifetime || 8760,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  projects.push(newProject);
  setStorageData(STORAGE_KEYS.PROJECTS, projects);
  return newProject;
};

export const updateProject = async (projectId, projectData) => {
  const projects = getStorageData(STORAGE_KEYS.PROJECTS);
  const index = projects.findIndex(p => p.id === parseInt(projectId));
  if (index === -1) {
    throw new Error('Project not found');
  }
  projects[index] = {
    ...projects[index],
    ...projectData,
    updated_at: new Date().toISOString()
  };
  setStorageData(STORAGE_KEYS.PROJECTS, projects);
  return projects[index];
};

export const deleteProject = async (projectId) => {
  const projects = getStorageData(STORAGE_KEYS.PROJECTS);
  const filteredProjects = projects.filter(p => p.id !== parseInt(projectId));
  setStorageData(STORAGE_KEYS.PROJECTS, filteredProjects);

  // Also delete related safety functions, components, and failure modes
  const safetyFunctions = getStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS);
  setStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS, safetyFunctions.filter(sf => sf.project !== parseInt(projectId)));

  const components = getStorageData(STORAGE_KEYS.COMPONENTS);
  const compToDelete = components.filter(c => c.project === parseInt(projectId));
  const compIds = compToDelete.map(c => c.id);
  setStorageData(STORAGE_KEYS.COMPONENTS, components.filter(c => c.project !== parseInt(projectId)));

  const failureModes = getStorageData(STORAGE_KEYS.FAILURE_MODES);
  setStorageData(STORAGE_KEYS.FAILURE_MODES, failureModes.filter(fm => !compIds.includes(fm.component)));

  return { message: 'Project deleted successfully' };
};

// ==================== Safety Functions API ====================

export const getSafetyFunctions = async (projectId) => {
  const safetyFunctions = getStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS);
  const projectSFs = safetyFunctions.filter(sf => sf.project === parseInt(projectId));

  // Map old fields to new fields if necessary
  return projectSFs.map(sf => ({
    ...sf,
    sf_id: sf.sf_id || sf.name || 'SF_UNKNOWN',
    target_integrity_level: sf.target_integrity_level || sf.asil_level || 'QM',
    description: sf.description || ''
  }));
};

export const createSafetyFunction = async (safetyFunctionData) => {
  const safetyFunctions = getStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS);
  const newSF = {
    id: getNextId(),
    sf_id: safetyFunctionData.sf_id || safetyFunctionData.name || 'SF_NEW',
    target_integrity_level: safetyFunctionData.target_integrity_level || safetyFunctionData.asil_level || 'QM',
    description: safetyFunctionData.description || '',
    project: parseInt(safetyFunctionData.project),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  safetyFunctions.push(newSF);
  setStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS, safetyFunctions);
  return newSF;
};

export const updateSafetyFunction = async (safetyFunctionId, safetyFunctionData) => {
  const safetyFunctions = getStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS);
  const index = safetyFunctions.findIndex(sf => sf.id === parseInt(safetyFunctionId));
  if (index === -1) {
    throw new Error('Safety function not found');
  }
  safetyFunctions[index] = {
    ...safetyFunctions[index],
    ...safetyFunctionData,
    updated_at: new Date().toISOString()
  };
  setStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS, safetyFunctions);
  return safetyFunctions[index];
};

export const deleteSafetyFunction = async (safetyFunctionId) => {
  const safetyFunctions = getStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS);
  setStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS, safetyFunctions.filter(sf => sf.id !== parseInt(safetyFunctionId)));
  return { message: 'Safety function deleted successfully' };
};

// ==================== Components API ====================

export const getComponents = async (projectId) => {
  const components = getStorageData(STORAGE_KEYS.COMPONENTS);
  const projectComponents = components.filter(c => c.project === parseInt(projectId));

  // Map old fields to new fields if necessary
  return projectComponents.map(c => ({
    ...c,
    comp_id: c.comp_id || c.name || 'Untitled Component',
    type: c.type || c.category || '',
    failure_rate: c.failure_rate || c.fit_rate || 0,
    is_safety_related: c.is_safety_related || false,
    related_sfs: c.related_sfs || []
  }));
};

export const createComponent = async (componentData) => {
  const components = getStorageData(STORAGE_KEYS.COMPONENTS);
  const newComponent = {
    id: getNextId(),
    comp_id: componentData.comp_id || componentData.name || 'Untitled Component',
    type: componentData.type || componentData.category || '',
    failure_rate: componentData.failure_rate || componentData.fit_rate || 0,
    is_safety_related: componentData.is_safety_related || false,
    related_sfs: (componentData.related_sfs || []).map(id => parseInt(id, 10)).filter(n => !Number.isNaN(n)),
    project: parseInt(componentData.project),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  components.push(newComponent);
  setStorageData(STORAGE_KEYS.COMPONENTS, components);
  return newComponent;
};

export const updateComponent = async (componentId, componentData) => {
  const components = getStorageData(STORAGE_KEYS.COMPONENTS);
  const index = components.findIndex(c => c.id === parseInt(componentId));
  if (index === -1) {
    throw new Error('Component not found');
  }
  
  // Ensure proper data types
  const updatedComponent = {
    ...components[index],
    comp_id: componentData.comp_id !== undefined ? componentData.comp_id : components[index].comp_id,
    type: componentData.type !== undefined ? componentData.type : components[index].type,
    failure_rate: componentData.failure_rate !== undefined ? parseFloat(componentData.failure_rate) : components[index].failure_rate,
    is_safety_related: componentData.is_safety_related !== undefined ? componentData.is_safety_related : components[index].is_safety_related,
    related_sfs: componentData.related_sfs !== undefined
      ? componentData.related_sfs.map(id => parseInt(id, 10)).filter(n => !Number.isNaN(n))
      : (components[index].related_sfs || []).map(id => parseInt(id, 10)).filter(n => !Number.isNaN(n)),
    project: components[index].project, // Preserve project ID
    updated_at: new Date().toISOString()
  };
  
  components[index] = updatedComponent;
  setStorageData(STORAGE_KEYS.COMPONENTS, components);
  return components[index];
};

export const deleteComponent = async (componentId) => {
  const components = getStorageData(STORAGE_KEYS.COMPONENTS);
  setStorageData(STORAGE_KEYS.COMPONENTS, components.filter(c => c.id !== parseInt(componentId)));

  // Also delete related failure modes
  const failureModes = getStorageData(STORAGE_KEYS.FAILURE_MODES);
  setStorageData(STORAGE_KEYS.FAILURE_MODES, failureModes.filter(fm => fm.component !== parseInt(componentId)));

  return { message: 'Component deleted successfully' };
};

// ==================== Failure Modes API ====================

export const getFailureModes = async (componentId) => {
  const failureModes = getStorageData(STORAGE_KEYS.FAILURE_MODES);
  const compIdNum = parseInt(componentId);
  
  // Filter by component ID, ensuring both are compared as numbers
  const componentFMs = failureModes.filter(fm => {
    const fmComponent = typeof fm.component === 'string' ? parseInt(fm.component) : fm.component;
    return fmComponent === compIdNum;
  });

  // Map old fields to new fields if necessary
  return componentFMs.map(fm => ({
    ...fm,
    description: fm.description || fm.name || 'Untitled Failure Mode',
    failure_rate_total: fm.failure_rate_total || fm.Failure_rate_total || fm.failure_rate_percentage || 0,
    Failure_rate_total: fm.Failure_rate_total || fm.failure_rate_total || fm.failure_rate_percentage || 0, // Return both for compatibility
    system_level_effect: fm.system_level_effect || fm.effect || '',
    is_SPF: fm.is_SPF !== undefined ? fm.is_SPF : (fm.safe_fault === false),
    is_MPF: fm.is_MPF !== undefined ? fm.is_MPF : false,
    component: typeof fm.component === 'string' ? parseInt(fm.component) : fm.component // Ensure number
  }));
};

export const createFailureMode = async (failureModeData) => {
  const failureModes = getStorageData(STORAGE_KEYS.FAILURE_MODES);
  
  // Handle both Failure_rate_total and failure_rate_total
  const failureRate = failureModeData.Failure_rate_total !== undefined 
    ? parseFloat(failureModeData.Failure_rate_total) 
    : (failureModeData.failure_rate_total !== undefined ? parseFloat(failureModeData.failure_rate_total) : 0);
  
  const newFM = {
    id: getNextId(),
    description: failureModeData.description || failureModeData.name || 'Untitled Failure Mode',
    component: parseInt(failureModeData.component), // CRITICAL: Always store as number
    system_level_effect: failureModeData.system_level_effect || '',
    failure_rate_total: failureRate || 0,
    Failure_rate_total: failureRate || 0, // Store both for compatibility
    is_SPF: failureModeData.is_SPF || false,
    is_MPF: failureModeData.is_MPF || false,
    SPF_safety_mechanism: failureModeData.SPF_safety_mechanism || '',
    SPF_diagnostic_coverage: parseFloat(failureModeData.SPF_diagnostic_coverage) || 0,
    MPF_safety_mechanism: failureModeData.MPF_safety_mechanism || '',
    MPF_diagnostic_coverage: parseFloat(failureModeData.MPF_diagnostic_coverage) || 0,
    failure_rate_percentage: failureModeData.failure_rate_percentage || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  failureModes.push(newFM);
  setStorageData(STORAGE_KEYS.FAILURE_MODES, failureModes);
  return newFM;
};

export const updateFailureMode = async (failureModeId, failureModeData) => {
  const failureModes = getStorageData(STORAGE_KEYS.FAILURE_MODES);
  const index = failureModes.findIndex(fm => fm.id === parseInt(failureModeId));
  if (index === -1) {
    throw new Error('Failure mode not found');
  }
  
  // Handle both Failure_rate_total and failure_rate_total
  const failureRate = failureModeData.Failure_rate_total !== undefined 
    ? parseFloat(failureModeData.Failure_rate_total) 
    : (failureModeData.failure_rate_total !== undefined ? parseFloat(failureModeData.failure_rate_total) : undefined);
  
  // CRITICAL: Preserve component ID as a number (fixes disappearing bug)
  const componentId = failureModeData.component !== undefined 
    ? parseInt(failureModeData.component) 
    : failureModes[index].component;
  
  // Update the failure mode
  failureModes[index] = {
    ...failureModes[index],
    description: failureModeData.description !== undefined ? failureModeData.description : failureModes[index].description,
    system_level_effect: failureModeData.system_level_effect !== undefined ? failureModeData.system_level_effect : failureModes[index].system_level_effect,
    is_SPF: failureModeData.is_SPF !== undefined ? failureModeData.is_SPF : failureModes[index].is_SPF,
    is_MPF: failureModeData.is_MPF !== undefined ? failureModeData.is_MPF : failureModes[index].is_MPF,
    SPF_safety_mechanism: failureModeData.SPF_safety_mechanism !== undefined ? failureModeData.SPF_safety_mechanism : failureModes[index].SPF_safety_mechanism,
    SPF_diagnostic_coverage: failureModeData.SPF_diagnostic_coverage !== undefined ? parseFloat(failureModeData.SPF_diagnostic_coverage) : failureModes[index].SPF_diagnostic_coverage,
    MPF_safety_mechanism: failureModeData.MPF_safety_mechanism !== undefined ? failureModeData.MPF_safety_mechanism : failureModes[index].MPF_safety_mechanism,
    MPF_diagnostic_coverage: failureModeData.MPF_diagnostic_coverage !== undefined ? parseFloat(failureModeData.MPF_diagnostic_coverage) : failureModes[index].MPF_diagnostic_coverage,
    component: componentId, // CRITICAL: Always keep as number
    failure_rate_total: failureRate !== undefined ? failureRate : failureModes[index].failure_rate_total,
    Failure_rate_total: failureRate !== undefined ? failureRate : (failureModes[index].Failure_rate_total || failureModes[index].failure_rate_total),
    updated_at: new Date().toISOString()
  };
  
  setStorageData(STORAGE_KEYS.FAILURE_MODES, failureModes);
  return failureModes[index];
};

export const deleteFailureMode = async (failureModeId) => {
  const failureModes = getStorageData(STORAGE_KEYS.FAILURE_MODES);
  setStorageData(STORAGE_KEYS.FAILURE_MODES, failureModes.filter(fm => fm.id !== parseInt(failureModeId)));
  return { message: 'Failure mode deleted successfully' };
};

// ==================== FMEDA Analysis API ====================

export const calculateFMEDA = async (projectId) => {
  const project = getStorageData(STORAGE_KEYS.PROJECTS).find(p => p.id === parseInt(projectId));
  if (!project) {
    throw new Error('Project not found');
  }

  const safetyFunctions = await getSafetyFunctions(projectId);
  const components = await getComponents(projectId);
  const lifetime = project.lifetime || 8760;

  const results = [];

  // Calculate metrics for each Safety Function
  for (const sf of safetyFunctions) {
    // Find components related to this SF
    const sfComponents = components.filter(c => {
      if (!c.related_sfs) return false;
      // Handle potential string/number mismatches
      return c.related_sfs.some(id => String(id) === String(sf.id));
    });

    // Get all failure modes for these components
    let allFailureModes = [];
    for (const component of sfComponents) {
      const fms = await getFailureModes(component.id);
      allFailureModes = allFailureModes.concat(fms.map(fm => ({
        ...fm,
        componentName: component.comp_id || component.name,
        componentFitRate: component.failure_rate || component.fit_rate || 0,
        componentQuantity: 1
      })));
    }

    let totalFIT = 0;
    let residualFIT = 0;   // RF (per FMEDA.py)
    let mpfDetectedFIT = 0; // MPFD
    let mpfLatentFIT = 0;   // MPFL

    // safetyrelated = sum of related components' total failure_rate (per FMEDA.py)
    let safetyrelated = 0;
    for (const comp of sfComponents) {
      safetyrelated += parseFloat(comp.failure_rate) || 0;
    }

    for (const fm of allFailureModes) {
      const baseFIT = fm.Failure_rate_total ?? fm.failure_rate_total ?? 0;
      totalFIT += baseFIT;

      // RF = is_SPF * Failure_rate_total * (1 - SPF_diagnostic_coverage/100) per FMEDA.py
      const rfThis = fm.is_SPF ? baseFIT * (1 - (parseFloat(fm.SPF_diagnostic_coverage) || 0) / 100) : 0;
      residualFIT += rfThis;

      // MPFL, MPFD from (Failure_rate_total - RF) per FMEDA.py set_mpf_mechanism
      if (fm.is_MPF) {
        const mpfBase = baseFIT - rfThis;
        const cov = parseFloat(fm.MPF_diagnostic_coverage) || 0;
        mpfLatentFIT += mpfBase * (1 - cov / 100);
        mpfDetectedFIT += mpfBase * (cov / 100);
      }
    }

    // SPFM = 1 - (RF / safetyrelated) per FMEDA.py; use totalFIT if safetyrelated is 0
    const denomSPFM = safetyrelated > 0 ? safetyrelated : totalFIT;
    const spfm = denomSPFM > 0 ? (1 - (residualFIT / denomSPFM)) * 100 : 0;

    // LFM = 1 - MPFL / (safetyrelated - RF) per FMEDA.py
    const lfmDenom = safetyrelated - residualFIT;
    const lfm = lfmDenom > 0 ? (1 - (mpfLatentFIT / lfmDenom)) * 100 : 0;

    // MPHF = (RF/1e9) + ((MPFL/1e9) * (MPFD/1e9) * lifetime) per FMEDA.py (dimensionless probability)
    const mphfProb = (residualFIT / 1e9) + ((mpfLatentFIT / 1e9) * (mpfDetectedFIT / 1e9) * lifetime);

    results.push({
      safety_function: sf.id,
      project_id: projectId,
      spfm,
      lfm,
      mphf: mphfProb,
      rf: residualFIT,
      mpfl: mpfLatentFIT,
      mpfd: mpfDetectedFIT,
      safetyrelated: safetyrelated > 0 ? safetyrelated : totalFIT
    });
  }

  return results; // Return Array
};

export const getProjectResults = async (projectId) => {
  // Just re-calculate and return results
  return await calculateFMEDA(projectId);
};

// ==================== CSV Import/Export API ====================

// Reset all storage and ID counter (used before full import so no ghost data remains)
const clearStorageForImport = () => {
  setStorageData(STORAGE_KEYS.PROJECTS, []);
  setStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS, []);
  setStorageData(STORAGE_KEYS.COMPONENTS, []);
  setStorageData(STORAGE_KEYS.FAILURE_MODES, []);
  localStorage.setItem(STORAGE_KEYS.NEXT_ID, '1');
};

export const importProject = async (formData) => {
  const file = formData.get('file');
  if (!file) {
    throw new Error('No file provided');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        const rows = parseCSV(csvContent);

        // Replace all data: clear first so no ghost data from previous project
        clearStorageForImport();

        // 1. Process Project
        const projectRow = rows.find(r => r.section === 'project');
        if (!projectRow) {
          throw new Error('Invalid CSV format: No project section found');
        }

        const project = {
          id: getNextId(),
          name: projectRow.name || file.name.replace('.csv', ''),
          lifetime: parseFloat(projectRow.lifetime) || 8760,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const projects = getStorageData(STORAGE_KEYS.PROJECTS);
        projects.push(project);
        setStorageData(STORAGE_KEYS.PROJECTS, projects);

        // 2. Process Safety Functions
        const safetyFunctions = getStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS);
        const sfMap = {}; // Maps external sf_id (string) to internal numeric ID

        rows.filter(r => r.section === 'sf').forEach(row => {
          const sfIdStr = String((row.id || row.sf_id || '')).trim() || `SF-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          const newSF = {
            id: getNextId(),
            sf_id: sfIdStr,
            description: (row.description || '').trim(),
            target_integrity_level: (row.target_integrity_level || 'QM').trim(),
            project: project.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          sfMap[sfIdStr] = newSF.id;
          safetyFunctions.push(newSF);
        });
        setStorageData(STORAGE_KEYS.SAFETY_FUNCTIONS, safetyFunctions);

        // 3. Process Components
        const components = getStorageData(STORAGE_KEYS.COMPONENTS);
        const compMap = {}; // Maps external comp_id (string) to internal numeric ID

        rows.filter(r => r.section === 'component').forEach(row => {
          // Parse related SF IDs
          const relatedSfIdsRaw = row.related_sf_ids || '';
          const relatedSfIds = relatedSfIdsRaw.split(',').map(s => String(s).trim()).filter(s => s);
          const relatedInternalIds = relatedSfIds.map(sid => sfMap[sid]).filter(id => id !== undefined);

          const isSafetyRelated = (String(row.is_safety_related).toLowerCase() === 'true') || relatedInternalIds.length > 0;

          const newComp = {
            id: getNextId(),
            comp_id: row.id || row.comp_id || `COMP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            type: row.type || '',
            failure_rate: parseFloat(row.failure_rate) || 0,
            is_safety_related: isSafetyRelated,
            related_sfs: relatedInternalIds,
            project: project.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          compMap[newComp.comp_id] = newComp.id;
          components.push(newComp);
        });
        setStorageData(STORAGE_KEYS.COMPONENTS, components);

        // 4. Process Failure Modes
        const failureModes = getStorageData(STORAGE_KEYS.FAILURE_MODES);

        rows.filter(r => r.section === 'fm').forEach(row => {
          const compExternalId = String(row.component_id || '').trim();
          const compInternalId = compMap[compExternalId];

          if (compInternalId) {
            const fitTotal = parseFloat(row.Failure_rate_total) || 0;
            const newFM = {
              id: getNextId(),
              component: compInternalId,
              description: row.description || 'Untitled Failure Mode',
              Failure_rate_total: fitTotal,
              failure_rate_total: fitTotal,
              system_level_effect: row.system_level_effect || '',
              is_SPF: parseInt(row.is_SPF) === 1,
              is_MPF: parseInt(row.is_MPF) === 1,
              SPF_safety_mechanism: row.SPF_safety_mechanism || '',
              SPF_diagnostic_coverage: parseFloat(row.SPF_diagnostic_coverage) || 0,
              MPF_safety_mechanism: row.MPF_safety_mechanism || '',
              MPF_diagnostic_coverage: parseFloat(row.MPF_diagnostic_coverage) || 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            failureModes.push(newFM);
          }
        });
        setStorageData(STORAGE_KEYS.FAILURE_MODES, failureModes);

        resolve(project);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        reject(new Error('Failed to parse CSV file: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Helper function to parse CSV content with headers
const parseCSV = (csvContent) => {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  // First line is header
  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      if (h && values[i] !== undefined) {
        obj[h.trim()] = values[i];
      }
    });
    return obj;
  });
};

// Helper function to parse a CSV line (handles quoted values)
const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Double quote inside quotes means literal quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

// Export project to CSV
export const exportProject = async (project) => {
  const safetyFunctions = await getSafetyFunctions(project.id);
  const components = await getComponents(project.id);
  // Calculate results to export metrics
  const results = await calculateFMEDA(project.id);

  const columns = [
    'section', 'name', 'lifetime', // Project
    'id', 'description', 'target_integrity_level', 'RF', 'MPFL', 'MPFD', 'MPHF', 'SPFM', 'LFM', 'safetyrelated', // SF + shared
    'type', 'failure_rate', 'related_sf_ids', 'is_safety_related', // Component
    'component_id', 'Failure_rate_total', 'system_level_effect', 'is_SPF', 'SPF_safety_mechanism', 'SPF_diagnostic_coverage', 'is_MPF', 'MPF_safety_mechanism', 'MPF_diagnostic_coverage' // FM
  ];

  let csv = columns.join(',') + '\n';

  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 1. Project Row
  csv += columns.map(col => {
    if (col === 'section') return 'project';
    if (col === 'name') return escape(project.name);
    if (col === 'lifetime') return escape(project.lifetime);
    return '';
  }).join(',') + '\n';

  // 2. Safety Functions
  for (const sf of safetyFunctions) {
    const res = results.find(r => r.safety_function === sf.id) || {};
    csv += columns.map(col => {
      if (col === 'section') return 'sf';
      if (col === 'id') return escape(sf.sf_id);
      if (col === 'description') return escape(sf.description);
      if (col === 'target_integrity_level') return escape(sf.target_integrity_level);
      // Metrics
      if (col === 'SPFM') return escape(res.spfm);
      if (col === 'LFM') return escape(res.lfm);
      if (col === 'MPHF') return escape(res.mphf);
      if (col === 'RF') return escape(res.rf);
      if (col === 'MPFL') return escape(res.mpfl);
      if (col === 'MPFD') return escape(res.mpfd);
      if (col === 'safetyrelated') return escape(res.safetyrelated);
      return '';
    }).join(',') + '\n';
  }

  // 3. Components
  for (const comp of components) {
    const linkedSfs = safetyFunctions.filter(sf => comp.related_sfs && comp.related_sfs.includes(sf.id));
    const relatedIdsStr = linkedSfs.map(sf => sf.sf_id).join(',');

    csv += columns.map(col => {
      if (col === 'section') return 'component';
      if (col === 'id') return escape(comp.comp_id);
      if (col === 'type') return escape(comp.type);
      if (col === 'failure_rate') return escape(comp.failure_rate);
      if (col === 'is_safety_related') return escape(comp.is_safety_related);
      if (col === 'related_sf_ids') return escape(relatedIdsStr);
      return '';
    }).join(',') + '\n';
  }

  // 4. Failure Modes
  for (const comp of components) {
    const fms = await getFailureModes(comp.id);
    for (const fm of fms) {
      csv += columns.map(col => {
        if (col === 'section') return 'fm';
        if (col === 'component_id') return escape(comp.comp_id);
        if (col === 'description') return escape(fm.description);
        if (col === 'Failure_rate_total') return escape(fm.Failure_rate_total ?? fm.failure_rate_total ?? 0);
        if (col === 'system_level_effect') return escape(fm.system_level_effect);
        if (col === 'is_SPF') return fm.is_SPF ? '1' : '0';
        if (col === 'SPF_safety_mechanism') return escape(fm.SPF_safety_mechanism);
        if (col === 'SPF_diagnostic_coverage') return escape(fm.SPF_diagnostic_coverage);
        if (col === 'is_MPF') return fm.is_MPF ? '1' : '0';
        if (col === 'MPF_safety_mechanism') return escape(fm.MPF_safety_mechanism);
        if (col === 'MPF_diagnostic_coverage') return escape(fm.MPF_diagnostic_coverage);
        return '';
      }).join(',') + '\n';
    }
  }

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (project.name || `project_${project.id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `${safeName}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  return csv;
};

// Clear all data
export const clearAllData = async () => {
  localStorage.removeItem(STORAGE_KEYS.PROJECTS);
  localStorage.removeItem(STORAGE_KEYS.SAFETY_FUNCTIONS);
  localStorage.removeItem(STORAGE_KEYS.COMPONENTS);
  localStorage.removeItem(STORAGE_KEYS.FAILURE_MODES);
  localStorage.removeItem(STORAGE_KEYS.NEXT_ID);
  return { message: 'All data cleared successfully' };
};
