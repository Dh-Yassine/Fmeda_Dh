import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./FailureModes.module.css";
import RippleButton from "../../components/RippleButton";
import { 
  getFailureModes, 
  createFailureMode, 
  updateFailureMode, 
  deleteFailureMode,
  getComponents 
} from "../../api/fmedaApi";

export default function FailureModes({ currentProject }) {
  const [failureModes, setFailureModes] = useState([]);
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [currentComponent, setCurrentComponent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    failure_rate_percent: "",
    system_level_effect: "",
    is_SPF: false,
    is_MPF: false,
    SPF_safety_mechanism: "",
    SPF_diagnostic_coverage: "",
    MPF_safety_mechanism: "",
    MPF_diagnostic_coverage: "",
    component: null
  });
  const [, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { componentId } = useParams();

  // Load components and failure modes for current project
  useEffect(() => {
    if (currentProject) {
      loadComponents();
      if (componentId) {
        const compIdNum = parseInt(componentId); // Ensure number
        setSelectedComponent(compIdNum);
        loadFailureModes(compIdNum);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject, componentId]);

  const loadComponents = async () => {
    if (!currentProject) return;
    
    try {
      const data = await getComponents(currentProject.id);
      setComponents(data);
    } catch (error) {
      console.error("Failed to load components:", error);
      setError("Failed to load components.");
    }
  };

  const loadFailureModes = async (compId) => {
    if (!compId) return;
    
    try {
      // Ensure compId is always a number
      const compIdNum = typeof compId === 'string' ? parseInt(compId) : compId;
      console.log(`Loading failure modes for component ID: ${compIdNum}`);
      const data = await getFailureModes(compIdNum);
      console.log(`Received failure modes data:`, data);
      setFailureModes(data);
    } catch (error) {
      console.error("Failed to load failure modes:", error);
      setError("Failed to load failure modes.");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleComponentChange = (e) => {
    const compId = e.target.value;
    const compIdNum = parseInt(compId); // CRITICAL: Always convert to number
    setSelectedComponent(compIdNum);
    setForm(prev => ({ ...prev, component: compIdNum }));
    
    const selectedComp = components.find(c => c.id === compIdNum);
    setCurrentComponent(selectedComp);
    
    if (compId) {
      loadFailureModes(compIdNum);
    } else {
      setFailureModes([]);
      setCurrentComponent(null);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentProject) {
      setError("No project selected. Please create or load a project first.");
      return;
    }

    if (!form.description.trim() || !form.failure_rate_percent || !selectedComponent) {
      setError("Description, FIT percentage, and Component are required.");
      return;
    }

    const percent = parseFloat(form.failure_rate_percent);
    if (isNaN(percent) || percent < 0) {
      setError("FIT percentage must be a valid positive number.");
      return;
    }


    // Check for duplicate description
    const existingFM = failureModes.find(fm => 
      fm.description.toLowerCase() === form.description.toLowerCase() && 
      fm.id !== editingId
    );
    if (existingFM) {
      setError(`Failure mode with description '${form.description}' already exists for this component.`);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const compFit = parseFloat(currentComponent?.failure_rate || 0) || 0;
      const failureModeData = {
        description: form.description.trim(),
        system_level_effect: form.system_level_effect,
        is_SPF: !!form.is_SPF,
        is_MPF: !!form.is_MPF,
        SPF_safety_mechanism: form.is_SPF ? (form.SPF_safety_mechanism || '') : '',
        SPF_diagnostic_coverage: form.is_SPF && form.SPF_diagnostic_coverage !== ''
          ? Number(form.SPF_diagnostic_coverage)
          : 0,
        MPF_safety_mechanism: form.is_MPF ? (form.MPF_safety_mechanism || '') : '',
        MPF_diagnostic_coverage: form.is_MPF && form.MPF_diagnostic_coverage !== ''
          ? Number(form.MPF_diagnostic_coverage)
          : 0,
        component: parseInt(selectedComponent), // CRITICAL: Always ensure component is a number
        Failure_rate_total: compFit * (percent / 100),
        failure_rate_total: compFit * (percent / 100) // Send both for compatibility
      };

      console.log("Creating failure mode with data:", failureModeData);
      console.log("Form state:", form);
      console.log("Selected component:", selectedComponent);
      console.log("FIT %:", percent, "Computed FIT:", failureModeData.Failure_rate_total);

      if (editingId) {
        await updateFailureMode(editingId, failureModeData);
      } else {
        await createFailureMode(failureModeData);
      }

      // Reset form
      setForm({
        description: "",
        failure_rate_percent: "",
        system_level_effect: "",
        is_SPF: false,
        is_MPF: false,
        SPF_safety_mechanism: "",
        SPF_diagnostic_coverage: "",
        MPF_safety_mechanism: "",
        MPF_diagnostic_coverage: "",
        component: parseInt(selectedComponent) // Ensure number
      });
      setEditingId(null);
      setShowForm(false);

      // Reload failure modes
      await loadFailureModes(selectedComponent);
    } catch (error) {
      console.error("Failed to save failure mode:", error);
      setError("Failed to save failure mode. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const compFitValue = parseFloat(currentComponent?.failure_rate || 0) || 0;
  const fitPercentValue = parseFloat(form.failure_rate_percent || 0) || 0;
  const computedFit = (compFitValue * (fitPercentValue / 100)).toFixed(2);

  const handleEdit = (failureMode) => {
    const compFit = parseFloat(currentComponent?.failure_rate || 0) || 0;
    // Handle both field name variations
    const fitRate = failureMode.failure_rate_total || failureMode.Failure_rate_total || 0;
    const percent = compFit > 0 ? (fitRate / compFit) * 100 : 0;
    setForm({
      description: failureMode.description,
      failure_rate_percent: percent ? percent.toFixed(2) : "",
      system_level_effect: failureMode.system_level_effect,
      is_SPF: failureMode.is_SPF,
      is_MPF: failureMode.is_MPF,
      SPF_safety_mechanism: failureMode.SPF_safety_mechanism || '',
      SPF_diagnostic_coverage: (failureMode.SPF_diagnostic_coverage || 0).toString(),
      MPF_safety_mechanism: failureMode.MPF_safety_mechanism || '',
      MPF_diagnostic_coverage: (failureMode.MPF_diagnostic_coverage || 0).toString(),
      component: typeof failureMode.component === 'string' ? parseInt(failureMode.component) : failureMode.component // CRITICAL: Always ensure component is a number
    });
    setEditingId(failureMode.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this failure mode?")) {
      return;
    }

    try {
      await deleteFailureMode(id);
      await loadFailureModes(selectedComponent);
    } catch (error) {
      console.error("Failed to delete failure mode:", error);
      setError("Failed to delete failure mode.");
    }
  };

  const handleContinue = () => {
    navigate("/fmeda-analysis");
  };

  if (!currentProject) {
    return (
      <div className={styles.container}>
        <div className={styles.backdrop}></div>
        <div className={styles.noProject}>
          <h2>⚠️ No Project Selected</h2>
          <p>Please create or load a project first to manage failure modes.</p>
          <button className={styles.backBtn} onClick={() => navigate("/")}>
            <span className={styles.btnIcon}>🏠</span>
            <span>Go to Home</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backdrop}></div>
      
      <div className={styles.header}>
        <h2>🔧 Component Failure Modes</h2>
        <p className={styles.projectInfo}>
          Project: <span className={styles.projectName}>{currentProject.name}</span>
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span className={styles.labelIcon}>🔧</span>
                Select Component
              </label>
              <select
                name="component"
                value={selectedComponent || ""}
                onChange={handleComponentChange}
                className={styles.select}
                required
              >
                <option value="">Select a component...</option>
                {components.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.comp_id} - {comp.type}
                  </option>
                ))}
              </select>
              {currentComponent && (
                <p className={styles.helpText}>
                  Selected: {currentComponent.comp_id} ({currentComponent.type}) - 
                  Failure Rate: {currentComponent.failure_rate} FIT
                </p>
              )}
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h3>{editingId ? "✏️ Edit Failure Mode" : "➕ Add Failure Mode"}</h3>
              <p>{editingId ? "Update the selected failure mode" : "Add a new failure mode for the selected component"}</p>
            </div>

            {selectedComponent && !showForm && !editingId && (
              <div className={styles.formActions}>
                <RippleButton
                  type="button"
                  className={styles.saveBtn}
                  onClick={() => setShowForm(true)}
                >
                  <span className={styles.btnIcon}>➕</span>
                  <span>Add Failure Mode</span>
                </RippleButton>
              </div>
            )}

            {selectedComponent && (showForm || editingId) && (
              <>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <span className={styles.labelIcon}>📝</span>
                      Failure Mode Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Describe the failure mode..."
                      className={styles.textarea}
                      rows="3"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <span className={styles.labelIcon}>📊</span>
                      FIT Percentage (%)
                    </label>
                    <input
                      name="failure_rate_percent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.failure_rate_percent}
                      onChange={handleChange}
                      placeholder="e.g., 10, 25.5"
                      className={styles.input}
                      required
                    />
                    {selectedComponent && (
                      <p className={styles.helpText}>
                        Component FIT: {compFitValue} → Computed FM FIT: <strong>{computedFit} FIT</strong>
                      </p>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <span className={styles.labelIcon}>⚡</span>
                      System Level Effect
                    </label>
                    <input
                      name="system_level_effect"
                      type="text"
                      value={form.system_level_effect}
                      onChange={handleChange}
                      placeholder="e.g., Loss of function, Degraded performance"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        name="is_SPF"
                        type="checkbox"
                        checked={form.is_SPF}
                        onChange={handleChange}
                        className={styles.checkbox}
                      />
                      <span className={styles.checkboxText}>
                        <span className={styles.checkboxIcon}>🚨</span>
                        Single Point Failure (SPF)
                      </span>
                    </label>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        name="is_MPF"
                        type="checkbox"
                        checked={form.is_MPF}
                        onChange={handleChange}
                        className={styles.checkbox}
                      />
                      <span className={styles.checkboxText}>
                        <span className={styles.checkboxIcon}>⚠️</span>
                        Multiple Point Failure (MPF)
                      </span>
                    </label>
                  </div>
                </div>

                {form.is_SPF && (
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        <span className={styles.labelIcon}>🛡️</span>
                        SPF Safety Mechanism
                      </label>
                      <input
                        name="SPF_safety_mechanism"
                        type="text"
                        value={form.SPF_safety_mechanism}
                        onChange={handleChange}
                        placeholder="Describe the SPF safety mechanism..."
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        <span className={styles.labelIcon}>📈</span>
                        SPF Diagnostic Coverage (%)
                      </label>
                      <input
                        name="SPF_diagnostic_coverage"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={form.SPF_diagnostic_coverage}
                        onChange={handleChange}
                        placeholder="0-100"
                        className={styles.input}
                      />
                    </div>
                  </div>
                )}

                {form.is_MPF && (
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        <span className={styles.labelIcon}>🛡️</span>
                        MPF Safety Mechanism
                      </label>
                      <input
                        name="MPF_safety_mechanism"
                        type="text"
                        value={form.MPF_safety_mechanism}
                        onChange={handleChange}
                        placeholder="Describe the MPF safety mechanism..."
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        <span className={styles.labelIcon}>📈</span>
                        MPF Diagnostic Coverage (%)
                      </label>
                      <input
                        name="MPF_diagnostic_coverage"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={form.MPF_diagnostic_coverage}
                        onChange={handleChange}
                        placeholder="0-100"
                        className={styles.input}
                      />
                    </div>
                  </div>
                )}

                <div className={styles.formActions}>
                  <RippleButton
                    className={styles.saveBtn}
                    type="submit"
                    disabled={isLoading}
                  >
                    <span className={styles.btnIcon}>
                      {isLoading ? "⏳" : (editingId ? "✏️" : "➕")}
                    </span>
                    <span>
                      {isLoading ? "Saving..." : (editingId ? "Update Failure Mode" : "Add Failure Mode")}
                    </span>
                  </RippleButton>
                  {(editingId || showForm) && (
                    <RippleButton
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => {
                        setForm({
                          description: "",
                          failure_rate_percent: "",
                          system_level_effect: "",
                          is_SPF: false,
                          is_MPF: false,
                          SPF_safety_mechanism: "",
                          SPF_diagnostic_coverage: "",
                          MPF_safety_mechanism: "",
                          MPF_diagnostic_coverage: "",
                          component: parseInt(selectedComponent) // Ensure number
                        });
                        setEditingId(null);
                        setShowForm(false);
                      }}
                    >
                      <span className={styles.btnIcon}>❌</span>
                      <span>Cancel</span>
                    </RippleButton>
                  )}
                </div>
              </>
            )}
          </div>
        </form>

        {selectedComponent && (
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h3>Failure Modes for {currentComponent?.comp_id} ({failureModes.length})</h3>
              {failureModes.length > 0 && (
                <RippleButton className={styles.continueBtn} onClick={handleContinue}>
                  <span className={styles.btnIcon}>🚀</span>
                  <span>Continue to FMEDA Analysis</span>
                  <span className={styles.btnArrow}>→</span>
                </RippleButton>
              )}
            </div>

            {failureModes.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔧</div>
                <h4>No Failure Modes Defined</h4>
                <p>Click "Add Failure Mode" to create your first failure mode.</p>
                <p>Failure modes describe how components can fail and their safety mechanisms.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>FIT Rate</th>
                      <th className={styles.systemEffectHeader}>Local Effect</th>
                      <th>Safety Related</th>
                      <th>SPF</th>
                      <th>SPF Mechanism</th>
                      <th>SPF DC%</th>
                      <th>MPF</th>
                      <th>MPF Mechanism</th>
                      <th>MPF DC%</th>
                      <th>Properties</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failureModes.map((fm, i) => (
                      <motion.tr
                        key={fm.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(i * 0.025, 0.3) }}
                      >
                        <td className={styles.description}>{fm.description}</td>
                        <td className={styles.failureRate}>{fm.failure_rate_total || fm.Failure_rate_total || 0}</td>
                        <td className={styles.systemEffect}>{fm.system_level_effect}</td>
                        <td className={styles.safetyRelated}>{currentComponent?.is_safety_related ? "✅ Yes" : "❌ No"}</td>
                        <td className={styles.spf}>{fm.is_SPF ? "✅ Yes" : "❌ No"}</td>
                        <td className={styles.spfMechanism}>{fm.SPF_safety_mechanism || "-"}</td>
                        <td className={styles.spfDc}>{fm.is_SPF ? `${fm.SPF_diagnostic_coverage}%` : "N/A"}</td>
                        <td className={styles.mpf}>{fm.is_MPF ? "✅ Yes" : "❌ No"}</td>
                        <td className={styles.mpfMechanism}>{fm.MPF_safety_mechanism || "-"}</td>
                        <td className={styles.mpfDc}>{fm.is_MPF ? `${fm.MPF_diagnostic_coverage}%` : "N/A"}</td>
                        <td className={styles.properties}>
                          <RippleButton className={styles.editBtn} onClick={() => handleEdit(fm)} title="Edit Properties">
                            <span className={styles.btnIcon}>⚙️</span>
                            <span>Properties</span>
                          </RippleButton>
                        </td>
                        <td className={styles.actions}>
                          <RippleButton className={styles.deleteBtn} onClick={() => handleDelete(fm.id)} title="Delete">
                            <span className={styles.btnIcon}>🗑️</span>
                            <span>Delete</span>
                          </RippleButton>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
    </div>
  );
} 