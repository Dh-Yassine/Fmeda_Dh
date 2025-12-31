const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (Map-based for easy lookup)
const projects = new Map();
const safetyFunctions = new Map();
const components = new Map();
const failureModes = new Map();

let nextProjectId = 1;
let nextSfId = 1;
let nextCompId = 1;
let nextFmId = 1;

// FMEDA Calculation Logic (converted from Python)
function updateFailureModeCalculations(fm) {
  // SPF calculation
  fm.RF = (fm.is_SPF ? 1 : 0) * fm.Failure_rate_total * (1 - (fm.SPF_diagnostic_coverage / 100));
  
  // MPF calculation
  const mpfBase = fm.Failure_rate_total - fm.RF;
  fm.MPFL = (fm.is_MPF ? 1 : 0) * mpfBase * (1 - (fm.MPF_diagnostic_coverage / 100));
  fm.MPFD = (fm.is_MPF ? 1 : 0) * mpfBase * (fm.MPF_diagnostic_coverage / 100);
  
  return fm;
}

function calculateFMEDAMetrics(sf, lifetime) {
  // Reset metrics
  sf.RF = 0.0;
  sf.MPFL = 0.0;
  sf.MPFD = 0.0;
  sf.MPHF = 0.0;
  sf.SPFM = 0.0;
  sf.LFM = 0.0;
  sf.safetyrelated = 0.0;
  
  // Get related components
  const relatedComponents = Array.from(components.values()).filter(comp => 
    comp.related_sfs && comp.related_sfs.includes(sf.id)
  );
  
  if (relatedComponents.length === 0) {
    return sf;
  }
  
  for (const comp of relatedComponents) {
    sf.safetyrelated += comp.failure_rate;
    
    // Get failure modes for this component
    const compFailureModes = Array.from(failureModes.values()).filter(fm => 
      fm.component === comp.id
    );
    
    for (const fm of compFailureModes) {
      // Update failure mode calculations first
      updateFailureModeCalculations(fm);
      
      sf.RF += fm.RF;
      sf.MPFD += fm.MPFD;
      sf.MPFL += fm.MPFL;
    }
  }
  
  // MPHF calculation
  sf.MPHF = (sf.RF / 1e9) + ((sf.MPFL / 1e9) * (sf.MPFD / 1e9) * lifetime);
  
  // SPFM
  if (sf.safetyrelated > 0) {
    sf.SPFM = 1 - (sf.RF / sf.safetyrelated);
  } else {
    sf.SPFM = 0;
  }
  
  // LFM
  if ((sf.safetyrelated - sf.RF) > 0) {
    sf.LFM = 1 - (sf.MPFL / (sf.safetyrelated - sf.RF));
  } else {
    sf.LFM = 0;
  }
  
  return sf;
}

// Projects API
app.get('/projects/', (req, res) => {
  res.json(Array.from(projects.values()));
});

app.post('/projects/', (req, res) => {
  // Clear all existing data
  projects.clear();
  safetyFunctions.clear();
  components.clear();
  failureModes.clear();
  nextProjectId = 1;
  nextSfId = 1;
  nextCompId = 1;
  nextFmId = 1;
  
  const project = {
    id: nextProjectId++,
    name: req.body.name || 'New Project',
    lifetime: req.body.lifetime || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  projects.set(project.id, project);
  res.json(project);
});

app.get('/projects/:id/', (req, res) => {
  const project = projects.get(parseInt(req.params.id));
  if (!project) {
    return res.status(404).json({ detail: 'Project not found.' });
  }
  res.json(project);
});

app.patch('/projects/:id/', (req, res) => {
  const project = projects.get(parseInt(req.params.id));
  if (!project) {
    return res.status(404).json({ detail: 'Project not found.' });
  }
  
  Object.assign(project, req.body);
  project.updated_at = new Date().toISOString();
  projects.set(project.id, project);
  res.json(project);
});

app.delete('/projects/:id/', (req, res) => {
  const projectId = parseInt(req.params.id);
  if (!projects.has(projectId)) {
    return res.status(404).json({ detail: 'Project not found.' });
  }
  
  // Delete related data
  Array.from(safetyFunctions.values())
    .filter(sf => sf.project === projectId)
    .forEach(sf => safetyFunctions.delete(sf.id));
  
  Array.from(components.values())
    .filter(comp => comp.project === projectId)
    .forEach(comp => {
      Array.from(failureModes.values())
        .filter(fm => fm.component === comp.id)
        .forEach(fm => failureModes.delete(fm.id));
      components.delete(comp.id);
    });
  
  projects.delete(projectId);
  res.status(204).send();
});

// Safety Functions API
app.get('/safety-functions/', (req, res) => {
  const projectId = req.query.project;
  let sfs = Array.from(safetyFunctions.values());
  if (projectId) {
    sfs = sfs.filter(sf => sf.project === parseInt(projectId));
  }
  res.json(sfs);
});

app.post('/safety-functions/', (req, res) => {
  const sf = {
    id: nextSfId++,
    project: req.body.project,
    sf_id: req.body.sf_id,
    description: req.body.description || '',
    target_integrity_level: req.body.target_integrity_level || '',
    RF: 0,
    MPFL: 0,
    MPFD: 0,
    MPHF: 0,
    SPFM: 0,
    LFM: 0,
    safetyrelated: 0
  };
  
  safetyFunctions.set(sf.id, sf);
  res.status(201).json(sf);
});

app.get('/safety-functions/:id/', (req, res) => {
  const sf = safetyFunctions.get(parseInt(req.params.id));
  if (!sf) {
    return res.status(404).json({ detail: 'Safety function not found.' });
  }
  res.json(sf);
});

app.patch('/safety-functions/:id/', (req, res) => {
  const sf = safetyFunctions.get(parseInt(req.params.id));
  if (!sf) {
    return res.status(404).json({ detail: 'Safety function not found.' });
  }
  
  Object.assign(sf, req.body);
  safetyFunctions.set(sf.id, sf);
  res.json(sf);
});

app.delete('/safety-functions/:id/', (req, res) => {
  const sfId = parseInt(req.params.id);
  if (!safetyFunctions.has(sfId)) {
    return res.status(404).json({ detail: 'Safety function not found.' });
  }
  
  // Remove from components' related_sfs
  Array.from(components.values()).forEach(comp => {
    if (comp.related_sfs) {
      comp.related_sfs = comp.related_sfs.filter(id => id !== sfId);
    }
  });
  
  safetyFunctions.delete(sfId);
  res.status(204).send();
});

// Components API
app.get('/components/', (req, res) => {
  const projectId = req.query.project;
  let comps = Array.from(components.values());
  if (projectId) {
    comps = comps.filter(comp => comp.project === parseInt(projectId));
  }
  
  // Include related safety functions and failure modes
  const compsWithRelations = comps.map(comp => {
    const relatedSfs = (comp.related_sfs || []).map(sfId => {
      const sf = safetyFunctions.get(sfId);
      return sf ? { id: sf.id, sf_id: sf.sf_id, description: sf.description, target_integrity_level: sf.target_integrity_level } : null;
    }).filter(Boolean);
    
    const compFailureModes = Array.from(failureModes.values())
      .filter(fm => fm.component === comp.id);
    
    return {
      ...comp,
      related_sfs: relatedSfs,
      failure_modes: compFailureModes
    };
  });
  
  res.json(compsWithRelations);
});

app.post('/components/', (req, res) => {
  const comp = {
    id: nextCompId++,
    project: req.body.project,
    comp_id: req.body.comp_id,
    type: req.body.type || '',
    failure_rate: parseFloat(req.body.failure_rate) || 0,
    is_safety_related: req.body.is_safety_related || false,
    related_sfs: req.body.related_sfs || []
  };
  
  components.set(comp.id, comp);
  
  // Return with relations
  const relatedSfs = (comp.related_sfs || []).map(sfId => {
    const sf = safetyFunctions.get(sfId);
    return sf ? { id: sf.id, sf_id: sf.sf_id, description: sf.description, target_integrity_level: sf.target_integrity_level } : null;
  }).filter(Boolean);
  
  res.status(201).json({
    ...comp,
    related_sfs: relatedSfs,
    failure_modes: []
  });
});

app.get('/components/:id/', (req, res) => {
  const comp = components.get(parseInt(req.params.id));
  if (!comp) {
    return res.status(404).json({ detail: 'Component not found.' });
  }
  
  const relatedSfs = (comp.related_sfs || []).map(sfId => {
    const sf = safetyFunctions.get(sfId);
    return sf ? { id: sf.id, sf_id: sf.sf_id, description: sf.description, target_integrity_level: sf.target_integrity_level } : null;
  }).filter(Boolean);
  
  const compFailureModes = Array.from(failureModes.values())
    .filter(fm => fm.component === comp.id);
  
  res.json({
    ...comp,
    related_sfs: relatedSfs,
    failure_modes: compFailureModes
  });
});

app.patch('/components/:id/', (req, res) => {
  const comp = components.get(parseInt(req.params.id));
  if (!comp) {
    return res.status(404).json({ detail: 'Component not found.' });
  }
  
  if (req.body.related_sfs !== undefined) {
    comp.related_sfs = req.body.related_sfs;
  }
  if (req.body.comp_id !== undefined) comp.comp_id = req.body.comp_id;
  if (req.body.type !== undefined) comp.type = req.body.type;
  if (req.body.failure_rate !== undefined) comp.failure_rate = parseFloat(req.body.failure_rate) || 0;
  if (req.body.is_safety_related !== undefined) comp.is_safety_related = req.body.is_safety_related;
  
  components.set(comp.id, comp);
  
  const relatedSfs = (comp.related_sfs || []).map(sfId => {
    const sf = safetyFunctions.get(sfId);
    return sf ? { id: sf.id, sf_id: sf.sf_id, description: sf.description, target_integrity_level: sf.target_integrity_level } : null;
  }).filter(Boolean);
  
  const compFailureModes = Array.from(failureModes.values())
    .filter(fm => fm.component === comp.id);
  
  res.json({
    ...comp,
    related_sfs: relatedSfs,
    failure_modes: compFailureModes
  });
});

app.delete('/components/:id/', (req, res) => {
  const compId = parseInt(req.params.id);
  if (!components.has(compId)) {
    return res.status(404).json({ detail: 'Component not found.' });
  }
  
  // Delete related failure modes
  Array.from(failureModes.values())
    .filter(fm => fm.component === compId)
    .forEach(fm => failureModes.delete(fm.id));
  
  components.delete(compId);
  res.status(204).send();
});

// Failure Modes API
app.get('/failure-modes/by-component/:componentId/', (req, res) => {
  const componentId = parseInt(req.params.componentId);
  const fms = Array.from(failureModes.values())
    .filter(fm => fm.component === componentId)
    .map(fm => ({
      id: fm.id,
      description: fm.description,
      failure_rate_total: fm.Failure_rate_total,
      system_level_effect: fm.system_level_effect,
      is_SPF: fm.is_SPF,
      is_MPF: fm.is_MPF,
      SPF_safety_mechanism: fm.SPF_safety_mechanism,
      SPF_diagnostic_coverage: fm.SPF_diagnostic_coverage,
      MPF_safety_mechanism: fm.MPF_safety_mechanism,
      MPF_diagnostic_coverage: fm.MPF_diagnostic_coverage,
      RF: fm.RF,
      MPFL: fm.MPFL,
      MPFD: fm.MPFD,
      component: fm.component
    }));
  res.json(fms);
});

app.post('/failure-modes/', (req, res) => {
  const fm = {
    id: nextFmId++,
    component: parseInt(req.body.component),
    description: req.body.description,
    Failure_rate_total: parseFloat(req.body.Failure_rate_total) || 0,
    system_level_effect: req.body.system_level_effect || '',
    is_SPF: req.body.is_SPF || false,
    is_MPF: req.body.is_MPF || false,
    SPF_safety_mechanism: req.body.SPF_safety_mechanism || '',
    SPF_diagnostic_coverage: parseFloat(req.body.SPF_diagnostic_coverage) || 0,
    MPF_safety_mechanism: req.body.MPF_safety_mechanism || '',
    MPF_diagnostic_coverage: parseFloat(req.body.MPF_diagnostic_coverage) || 0,
    RF: 0,
    MPFL: 0,
    MPFD: 0
  };
  
  updateFailureModeCalculations(fm);
  failureModes.set(fm.id, fm);
  
  res.status(201).json({
    id: fm.id,
    description: fm.description,
    failure_rate_total: fm.Failure_rate_total,
    system_level_effect: fm.system_level_effect,
    is_SPF: fm.is_SPF,
    is_MPF: fm.is_MPF,
    SPF_safety_mechanism: fm.SPF_safety_mechanism,
    SPF_diagnostic_coverage: fm.SPF_diagnostic_coverage,
    MPF_safety_mechanism: fm.MPF_safety_mechanism,
    MPF_diagnostic_coverage: fm.MPF_diagnostic_coverage,
    RF: fm.RF,
    MPFL: fm.MPFL,
    MPFD: fm.MPFD,
    component: fm.component
  });
});

app.patch('/failure-modes/:id/', (req, res) => {
  const fm = failureModes.get(parseInt(req.params.id));
  if (!fm) {
    return res.status(404).json({ detail: 'Failure mode not found.' });
  }
  
  if (req.body.description !== undefined) fm.description = req.body.description;
  if (req.body.Failure_rate_total !== undefined) fm.Failure_rate_total = parseFloat(req.body.Failure_rate_total) || 0;
  if (req.body.system_level_effect !== undefined) fm.system_level_effect = req.body.system_level_effect;
  if (req.body.is_SPF !== undefined) fm.is_SPF = req.body.is_SPF;
  if (req.body.is_MPF !== undefined) fm.is_MPF = req.body.is_MPF;
  if (req.body.SPF_safety_mechanism !== undefined) fm.SPF_safety_mechanism = req.body.SPF_safety_mechanism;
  if (req.body.SPF_diagnostic_coverage !== undefined) fm.SPF_diagnostic_coverage = parseFloat(req.body.SPF_diagnostic_coverage) || 0;
  if (req.body.MPF_safety_mechanism !== undefined) fm.MPF_safety_mechanism = req.body.MPF_safety_mechanism;
  if (req.body.MPF_diagnostic_coverage !== undefined) fm.MPF_diagnostic_coverage = parseFloat(req.body.MPF_diagnostic_coverage) || 0;
  
  updateFailureModeCalculations(fm);
  failureModes.set(fm.id, fm);
  
  res.json({
    id: fm.id,
    description: fm.description,
    failure_rate_total: fm.Failure_rate_total,
    system_level_effect: fm.system_level_effect,
    is_SPF: fm.is_SPF,
    is_MPF: fm.is_MPF,
    SPF_safety_mechanism: fm.SPF_safety_mechanism,
    SPF_diagnostic_coverage: fm.SPF_diagnostic_coverage,
    MPF_safety_mechanism: fm.MPF_safety_mechanism,
    MPF_diagnostic_coverage: fm.MPF_diagnostic_coverage,
    RF: fm.RF,
    MPFL: fm.MPFL,
    MPFD: fm.MPFD,
    component: fm.component
  });
});

app.delete('/failure-modes/:id/', (req, res) => {
  const fmId = parseInt(req.params.id);
  if (!failureModes.has(fmId)) {
    return res.status(404).json({ detail: 'Failure mode not found.' });
  }
  failureModes.delete(fmId);
  res.status(204).send();
});

// FMEDA Calculation
app.post('/fmeda/calculate/', (req, res) => {
  const projectId = parseInt(req.body.project);
  const project = projects.get(projectId);
  if (!project) {
    return res.status(404).json({ detail: 'Project not found.' });
  }
  
  // Update all FailureModes for all components in the project
  const projectComponents = Array.from(components.values())
    .filter(comp => comp.project === projectId);
  
  for (const comp of projectComponents) {
    const compFailureModes = Array.from(failureModes.values())
      .filter(fm => fm.component === comp.id);
    for (const fm of compFailureModes) {
      updateFailureModeCalculations(fm);
    }
  }
  
  // Update all SafetyFunctions
  const projectSfs = Array.from(safetyFunctions.values())
    .filter(sf => sf.project === projectId);
  
  for (const sf of projectSfs) {
    calculateFMEDAMetrics(sf, parseFloat(project.lifetime) || 0);
  }
  
  // Return results
  const results = projectSfs.map(sf => ({
    safety_function: sf.id,
    sf_id: sf.sf_id,
    spfm: sf.SPFM * 100,
    lfm: sf.LFM * 100,
    mphf: sf.MPHF,
    rf: sf.RF,
    mpfl: sf.MPFL,
    mpfd: sf.MPFD,
    safetyrelated: sf.safetyrelated
  }));
  
  res.json(results);
});

app.get('/fmeda/results/:projectId/', (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const project = projects.get(projectId);
  if (!project) {
    return res.status(404).json({ detail: 'Project not found.' });
  }
  
  const projectSfs = Array.from(safetyFunctions.values())
    .filter(sf => sf.project === projectId);
  
  const results = projectSfs.map(sf => ({
    safety_function: sf.id,
    sf_id: sf.sf_id,
    spfm: sf.SPFM * 100,
    lfm: sf.LFM * 100,
    mphf: sf.MPHF,
    rf: sf.RF,
    mpfl: sf.MPFL,
    mpfd: sf.MPFD,
    safetyrelated: sf.safetyrelated
  }));
  
  res.json(results);
});

// CSV Import
const upload = multer({ storage: multer.memoryStorage() });

app.post('/projects/import-csv/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'No file uploaded.' });
  }
  
  try {
    // Clear all existing data
    projects.clear();
    safetyFunctions.clear();
    components.clear();
    failureModes.clear();
    nextProjectId = 1;
    nextSfId = 1;
    nextCompId = 1;
    nextFmId = 1;
    
    const csvData = [];
    const stream = Readable.from(req.file.buffer.toString());
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => csvData.push(row))
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Create project
    const projectRow = csvData.find(row => row.section === 'project');
    if (!projectRow) {
      return res.status(400).json({ detail: 'No project section found in CSV.' });
    }
    
    const project = {
      id: nextProjectId++,
      name: projectRow.name || 'Imported Project',
      lifetime: parseFloat(projectRow.lifetime) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    projects.set(project.id, project);
    
    // Create safety functions
    const sfMap = new Map();
    csvData.filter(row => row.section === 'sf').forEach(row => {
      const sf = {
        id: nextSfId++,
        project: project.id,
        sf_id: String(row.id || ''),
        description: row.description || '',
        target_integrity_level: row.target_integrity_level || '',
        RF: 0,
        MPFL: 0,
        MPFD: 0,
        MPHF: 0,
        SPFM: 0,
        LFM: 0,
        safetyrelated: 0
      };
      safetyFunctions.set(sf.id, sf);
      sfMap.set(sf.sf_id, sf);
    });
    
    // Create components
    const compMap = new Map();
    csvData.filter(row => row.section === 'component').forEach(row => {
      const comp = {
        id: nextCompId++,
        project: project.id,
        comp_id: String(row.id || ''),
        type: row.type || '',
        failure_rate: parseFloat(row.failure_rate) || 0,
        is_safety_related: row.related_sf_ids ? true : (row.is_safety_related === 'true' || row.is_safety_related === true),
        related_sfs: []
      };
      
      if (row.related_sf_ids) {
        const sfIds = String(row.related_sf_ids).split(',').map(id => id.trim());
        comp.related_sfs = sfIds.map(sfId => {
          const sf = Array.from(sfMap.values()).find(s => s.sf_id === sfId);
          return sf ? sf.id : null;
        }).filter(Boolean);
      }
      
      components.set(comp.id, comp);
      compMap.set(comp.comp_id, comp);
    });
    
    // Create failure modes
    csvData.filter(row => row.section === 'fm').forEach(row => {
      const compId = String(row.component_id || '');
      const comp = Array.from(compMap.values()).find(c => c.comp_id === compId);
      if (comp) {
        const fm = {
          id: nextFmId++,
          component: comp.id,
          description: row.description || '',
          Failure_rate_total: parseFloat(row.Failure_rate_total) || 0,
          system_level_effect: row.system_level_effect || '',
          is_SPF: row.is_SPF === 'true' || row.is_SPF === true || row.is_SPF === '1' || row.is_SPF === 1,
          is_MPF: row.is_MPF === 'true' || row.is_MPF === true || row.is_MPF === '1' || row.is_MPF === 1,
          SPF_safety_mechanism: row.SPF_safety_mechanism || '',
          SPF_diagnostic_coverage: parseFloat(row.SPF_diagnostic_coverage) || 0,
          MPF_safety_mechanism: row.MPF_safety_mechanism || '',
          MPF_diagnostic_coverage: parseFloat(row.MPF_diagnostic_coverage) || 0,
          RF: 0,
          MPFL: 0,
          MPFD: 0
        };
        updateFailureModeCalculations(fm);
        failureModes.set(fm.id, fm);
      }
    });
    
    // Calculate metrics
    const projectSfs = Array.from(safetyFunctions.values())
      .filter(sf => sf.project === project.id);
    for (const sf of projectSfs) {
      calculateFMEDAMetrics(sf, parseFloat(project.lifetime) || 0);
    }
    
    res.json(project);
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(400).json({ detail: `Failed to import CSV: ${error.message}` });
  }
});

// CSV Export
app.get('/projects/:id/export-csv/', (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = projects.get(projectId);
  if (!project) {
    return res.status(404).json({ detail: 'Project not found.' });
  }
  
  const rows = [];
  
  // Project row
  rows.push({
    section: 'project',
    name: project.name,
    lifetime: project.lifetime,
    id: '',
    description: '',
    target_integrity_level: '',
    type: '',
    failure_rate: '',
    related_sf_ids: '',
    is_safety_related: '',
    component_id: '',
    Failure_rate_total: '',
    system_level_effect: '',
    is_SPF: '',
    SPF_safety_mechanism: '',
    SPF_diagnostic_coverage: '',
    is_MPF: '',
    MPF_safety_mechanism: '',
    MPF_diagnostic_coverage: ''
  });
  
  // Safety functions
  const projectSfs = Array.from(safetyFunctions.values())
    .filter(sf => sf.project === projectId);
  projectSfs.forEach(sf => {
    rows.push({
      section: 'sf',
      name: '',
      lifetime: '',
      id: sf.sf_id,
      description: sf.description,
      target_integrity_level: sf.target_integrity_level,
      type: '',
      failure_rate: '',
      related_sf_ids: '',
      is_safety_related: '',
      component_id: '',
      Failure_rate_total: '',
      system_level_effect: '',
      is_SPF: '',
      SPF_safety_mechanism: '',
      SPF_diagnostic_coverage: '',
      is_MPF: '',
      MPF_safety_mechanism: '',
      MPF_diagnostic_coverage: ''
    });
  });
  
  // Components
  const projectComponents = Array.from(components.values())
    .filter(comp => comp.project === projectId);
  projectComponents.forEach(comp => {
    const relatedSfIds = (comp.related_sfs || []).map(sfId => {
      const sf = safetyFunctions.get(sfId);
      return sf ? sf.sf_id : null;
    }).filter(Boolean).join(',');
    
    rows.push({
      section: 'component',
      name: '',
      lifetime: '',
      id: comp.comp_id,
      description: '',
      target_integrity_level: '',
      type: comp.type,
      failure_rate: comp.failure_rate,
      related_sf_ids: relatedSfIds,
      is_safety_related: comp.is_safety_related ? 'true' : 'false',
      component_id: '',
      Failure_rate_total: '',
      system_level_effect: '',
      is_SPF: '',
      SPF_safety_mechanism: '',
      SPF_diagnostic_coverage: '',
      is_MPF: '',
      MPF_safety_mechanism: '',
      MPF_diagnostic_coverage: ''
    });
  });
  
  // Failure modes
  projectComponents.forEach(comp => {
    const compFailureModes = Array.from(failureModes.values())
      .filter(fm => fm.component === comp.id);
    compFailureModes.forEach(fm => {
      rows.push({
        section: 'fm',
        name: '',
        lifetime: '',
        id: '',
        description: '',
        target_integrity_level: '',
        type: '',
        failure_rate: '',
        related_sf_ids: '',
        is_safety_related: '',
        component_id: comp.comp_id,
        Failure_rate_total: fm.Failure_rate_total,
        system_level_effect: fm.system_level_effect,
        is_SPF: fm.is_SPF ? 'true' : 'false',
        SPF_safety_mechanism: fm.SPF_safety_mechanism,
        SPF_diagnostic_coverage: fm.SPF_diagnostic_coverage,
        is_MPF: fm.is_MPF ? 'true' : 'false',
        MPF_safety_mechanism: fm.MPF_safety_mechanism,
        MPF_diagnostic_coverage: fm.MPF_diagnostic_coverage
      });
    });
  });
  
  // Convert to CSV manually (simple implementation)
  const headers = Object.keys(rows[0] || {});
  const csvLines = [headers.join(',')];
  
  rows.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvLines.push(values.join(','));
  });
  
  const csvString = csvLines.join('\n');
  
  const safeName = (project.name || `project_${project.id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
  res.send(csvString);
});

// Clear all data
app.get('/projects/clear-all/', (req, res) => {
  projects.clear();
  safetyFunctions.clear();
  components.clear();
  failureModes.clear();
  nextProjectId = 1;
  nextSfId = 1;
  nextCompId = 1;
  nextFmId = 1;
  res.json({ message: 'All data cleared successfully' });
});

// Export for Vercel serverless functions
// Vercel automatically handles Express apps in the api/ folder
module.exports = app;

