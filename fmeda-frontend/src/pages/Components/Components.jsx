import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getComponents,
  createComponent,
  updateComponent,
  deleteComponent,
  getSafetyFunctions,
  createFailureMode
} from "../../api/fmedaApi";
import styles from "./Components.module.css";
import RippleButton from "../../components/RippleButton";
import { showToast } from "../../App";

// Component type suggestions for better UX
const COMPONENT_TYPE_SUGGESTIONS = [
  { value: "Resistor", icon: "🔌", description: "Electrical resistance component" },
  { value: "Capacitor", icon: "⚡", description: "Energy storage component" },
  { value: "Inductor", icon: "🌀", description: "Magnetic energy storage" },
  { value: "Diodes", icon: "➡️", description: "One-way current flow" },
  { value: "Transistor/transistor like", icon: "🔊", description: "Amplification and switching" },
  { value: "IC", icon: "🔲", description: "Integrated circuit" },
  { value: "Relays, contactors", icon: "🔗", description: "Electromechanical switches" },
  { value: "Transformer", icon: "⚡", description: "Voltage transformation" },
  { value: "Thermistor", icon: "🌡️", description: "Temperature-sensitive resistor" },
  { value: "Crystals", icon: "💎", description: "Oscillator component" },
  { value: "Sensor", icon: "📡", description: "Measurement device" },
  { value: "Actuator", icon: "⚙️", description: "Motion control device" },
  { value: "Microcontroller", icon: "🧠", description: "Programmable controller" },
  { value: "Power Supply", icon: "🔋", description: "Power conversion" },
  { value: "Connector", icon: "🔌", description: "Connection interface" },
  { value: "Switch", icon: "🔘", description: "Manual control" },
  { value: "LED", icon: "💡", description: "Light emitting diode" },
  { value: "Display", icon: "📺", description: "Visual output device" },
  { value: "Motor", icon: "🔄", description: "Rotational actuator" },
  { value: "Battery", icon: "🔋", description: "Energy storage" },
  { value: "Fuse", icon: "🛡️", description: "Overcurrent protection" },
  { value: "Varistor", icon: "⚡", description: "Voltage-dependent resistor" },
  { value: "Oscillator", icon: "🔄", description: "Clock generation" },
  { value: "Amplifier", icon: "🔊", description: "Signal amplification" },
  { value: "Filter", icon: "🎛️", description: "Signal filtering" },
  { value: "Converter", icon: "🔄", description: "Signal conversion" },
  { value: "Regulator", icon: "⚖️", description: "Voltage regulation" },
  { value: "Interface", icon: "🔗", description: "Communication interface" },
  { value: "Memory", icon: "💾", description: "Data storage" },
  { value: "Other", icon: "🔧", description: "Other component type" }
];

// Predefined failure modes based on component type (from fmeda_gui.py)
const PREDEFINED_FAILURE_MODES = {
  "Resistor": [
    { "description": "Open circuit", "fit_rate": 10.0, "system_effect": "Loss of function" },
    { "description": "Short circuit", "fit_rate": 5.0, "system_effect": "Overcurrent/overheating" }
  ],
  "Capacitor": [
    { "description": "Open circuit", "fit_rate": 15.0, "system_effect": "Loss of filtering/decoupling" },
    { "description": "Short circuit", "fit_rate": 8.0, "system_effect": "Overcurrent/overheating" }
  ],
  "Inductor": [
    { "description": "Open circuit", "fit_rate": 12.0, "system_effect": "Loss of filtering" },
    { "description": "Short circuit", "fit_rate": 6.0, "system_effect": "Overcurrent/overheating" }
  ],
  "Diodes": [
    { "description": "Open circuit", "fit_rate": 20.0, "system_effect": "Loss of rectification/protection" },
    { "description": "Short circuit", "fit_rate": 10.0, "system_effect": "Overcurrent/overheating" }
  ],
  "Transistor/transistor like": [
    { "description": "Pin open circuit", "fit_rate": 25.0, "system_effect": "Loss of switching/amplification" },
    { "description": "Pin to pin short circuit", "fit_rate": 15.0, "system_effect": "Malfunction" },
    { "description": "Pin to GND short circuit", "fit_rate": 12.0, "system_effect": "Loss of function" },
    { "description": "Pin to VCC short circuit", "fit_rate": 12.0, "system_effect": "Overcurrent/overheating" }
  ],
  "IC": [
    { "description": "Pin open circuit", "fit_rate": 30.0, "system_effect": "Loss of function" },
    { "description": "Pin to pin short circuit", "fit_rate": 20.0, "system_effect": "Malfunction" },
    { "description": "Pin to GND short circuit", "fit_rate": 15.0, "system_effect": "Loss of function" },
    { "description": "Pin to VCC short circuit", "fit_rate": 15.0, "system_effect": "Overcurrent/overheating" }
  ],
  "Relays, contactors": [
    { "description": "Stuck close", "fit_rate": 35.0, "system_effect": "Continuous operation" },
    { "description": "Stuck open", "fit_rate": 35.0, "system_effect": "Loss of switching" }
  ],
  "Transformer": [
    { "description": "Pin open circuit", "fit_rate": 18.0, "system_effect": "Loss of isolation/transformation" },
    { "description": "Pin to pin short circuit", "fit_rate": 12.0, "system_effect": "Malfunction" },
    { "description": "Pin to GND short circuit", "fit_rate": 10.0, "system_effect": "Loss of isolation" },
    { "description": "Pin to VCC short circuit", "fit_rate": 10.0, "system_effect": "Overcurrent/overheating" }
  ],
  "Thermistor": [
    { "description": "Open circuit", "fit_rate": 22.0, "system_effect": "Loss of temperature sensing" },
    { "description": "Short circuit", "fit_rate": 11.0, "system_effect": "False temperature reading" },
    { "description": "Resistance drift", "fit_rate": 8.0, "system_effect": "Inaccurate temperature reading" }
  ],
  "Crystals": [
    { "description": "Open circuit", "fit_rate": 28.0, "system_effect": "Loss of clock signal" },
    { "description": "Short circuit", "fit_rate": 14.0, "system_effect": "Clock malfunction" },
    { "description": "Frequency drift", "fit_rate": 10.0, "system_effect": "Inaccurate timing" }
  ]
};

// Custom Select Component
const CustomSelect = ({ value, onChange, options, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`${styles.customSelect} ${className}`} ref={selectRef}>
      <div className={`${styles.selectContainer} ${isOpen ? styles.open : ''}`}>
        <input
          type="text"
          className={styles.selectInput}
          value={selectedOption ? `${selectedOption.icon} ${selectedOption.value}` : ''}
          placeholder={placeholder}
          onClick={() => setIsOpen(!isOpen)}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          readOnly={!isOpen}
        />
        <span className={styles.selectArrow}>▼</span>

        {isOpen && (
          <div className={styles.selectDropdown}>
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`${styles.selectOption} ${value === option.value ? styles.selected : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                <span className={styles.selectOptionIcon}>{option.icon}</span>
                <div className={styles.selectOptionText}>
                  <div>{option.value}</div>
                  <div className={styles.selectOptionDescription}>{option.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Components({ currentProject }) {
  const [components, setComponents] = useState([]);
  const [safetyFunctions, setSafetyFunctions] = useState([]);
  const [form, setForm] = useState({
    comp_id: "",
    type: "",
    failure_rate: "",
    is_safety_related: false,
    related_sfs: [],
  });
  // removed Import BOM feature
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedFailureModes, setSelectedFailureModes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Load components and safety functions for current project
  useEffect(() => {
    if (currentProject) {
      loadComponents();
      loadSafetyFunctions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  // Get predefined failure modes for selected component type
  const getPredefinedFailureModes = () => {
    if (!form.type || !form.failure_rate) return [];
    return PREDEFINED_FAILURE_MODES[form.type] || [];
  };

  const predefinedFMs = getPredefinedFailureModes();

  // Handle failure mode selection
  const handleFailureModeToggle = (index) => {
    setSelectedFailureModes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleSelectAllFailureModes = () => {
    setSelectedFailureModes(predefinedFMs.map((_, index) => index));
  };

  const handleClearAllFailureModes = () => {
    setSelectedFailureModes([]);
  };

  const loadComponents = async () => {
    if (!currentProject) return;

    try {
      const data = await getComponents(currentProject.id);
      setComponents(data);
    } catch (error) {
      console.error("Failed to load components:", error);
      setError("Failed to load components.");
      showToast("error", "Failed to load components.");
    }
  };

  const loadSafetyFunctions = async () => {
    if (!currentProject) return;

    try {
      const data = await getSafetyFunctions(currentProject.id);
      setSafetyFunctions(data);
    } catch (error) {
      console.error("Failed to load safety functions:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear selected failure modes when type or failure rate changes
    if (name === 'type' || name === 'failure_rate') {
      setSelectedFailureModes([]);
    }
  };

  const handleSafetyFunctionToggle = (sfId) => {
    setForm((prev) => ({
      ...prev,
      related_sfs: prev.related_sfs.includes(sfId)
        ? prev.related_sfs.filter(id => id !== sfId)
        : [...prev.related_sfs, sfId]
    }));
  };

  const handleSelectAllSFs = () => {
    const allSfIds = safetyFunctions.map(sf => sf.id);
    setForm((prev) => ({
      ...prev,
      related_sfs: allSfIds
    }));
  };

  const handleClearAllSFs = () => {
    setForm((prev) => ({
      ...prev,
      related_sfs: []
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentProject) {
      setError("No project selected. Please create or load a project first.");
      showToast("error", "No project selected. Please create or load a project first.");
      return;
    }

    if (!form.comp_id.trim() || !form.type.trim() || !form.failure_rate) {
      setError("Component ID, Type, and Failure Rate are required.");
      showToast("error", "Component ID, Type, and Failure Rate are required.");
      return;
    }

    const failureRate = parseFloat(form.failure_rate);
    if (isNaN(failureRate) || failureRate < 0) {
      setError("Failure Rate must be a valid positive number.");
      showToast("error", "Failure Rate must be a valid positive number.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(""); // Clear previous success messages

    try {
      const payload = {
        comp_id: form.comp_id.trim(),
        type: form.type.trim(),
        failure_rate: failureRate,
        is_safety_related: form.is_safety_related,
        related_sfs: form.related_sfs,
        project: currentProject.id,
      };

      let result;
      if (editingId) {
        // Update existing component
        console.log("Updating component with payload:", payload);
        result = await updateComponent(editingId, payload);
        console.log("Component updated successfully");
      } else {
        // Create new component
        console.log("Creating component with payload:", payload);
        result = await createComponent(payload);
        console.log("Component created successfully");

        // Auto-populate failure modes only for new components
        if (selectedFailureModes.length > 0) {
          try {
            console.log(`Auto-populating ${selectedFailureModes.length} failure modes for component ${result.id}`);

            for (const fmIndex of selectedFailureModes) {
              const fmData = predefinedFMs[fmIndex];
              const actualFitRate = failureRate * (fmData.fit_rate / 100);
              const failureModePayload = {
                description: fmData.description,
                Failure_rate_total: actualFitRate,
                system_level_effect: fmData.system_effect,
                is_SPF: true,
                is_MPF: false,
                SPF_safety_mechanism: "None",
                SPF_diagnostic_coverage: 0,
                MPF_safety_mechanism: "",
                MPF_diagnostic_coverage: 0,
                component: result.id
              };

              console.log(`Creating failure mode with payload:`, failureModePayload);
              await createFailureMode(failureModePayload);
              console.log(`Successfully created failure mode: ${fmData.description}`);
            }

            console.log(`Successfully auto-populated ${selectedFailureModes.length} failure modes`);
          } catch (error) {
            console.error("Error auto-populating failure modes:", error);
            console.error("Error details:", error.response?.data);
            // Don't fail the component creation if auto-populate fails
            setError(`Component ${editingId ? 'updated' : 'created'} successfully, but auto-populate failed: ${error.response?.data?.detail || error.message}`);
            showToast("error", `Component ${editingId ? 'updated' : 'created'} successfully, but auto-populate failed: ${error.response?.data?.detail || error.message}`);
          }
        }
      }

      setForm({
        comp_id: "",
        type: "",
        failure_rate: "",
        is_safety_related: false,
        related_sfs: [],
      });
      setEditingId(null);
      setSelectedFailureModes([]);
      await loadComponents();

      // Show success message
      const successMsg = editingId
        ? `✅ Component '${form.comp_id}' updated successfully!`
        : (selectedFailureModes.length > 0
          ? `✅ Component '${form.comp_id}' created successfully with ${selectedFailureModes.length} auto-populated failure modes!`
          : `✅ Component '${form.comp_id}' created successfully!`);
      setSuccess(successMsg);
      showToast("success", successMsg);
      setTimeout(() => setSuccess(""), 5000);

    } catch (err) {
      console.error(`Error ${editingId ? 'updating' : 'creating'} component:`, err);
      setError(`Failed to ${editingId ? 'update' : 'add'} component. Check your input and try again.`);
      showToast("error", `Failed to ${editingId ? 'update' : 'add'} component. Check your input and try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    navigate("/failure-modes");
  };

  const handleFailureModes = (componentId) => {
    navigate(`/failure-modes/${componentId}`);
  };

  // Import BOM removed

  const handleEdit = (component) => {
    setForm({
      comp_id: component.comp_id,
      type: component.type,
      failure_rate: component.failure_rate.toString(),
      is_safety_related: component.is_safety_related,
      related_sfs: component.related_sfs ? [...component.related_sfs] : [],
    });
    setEditingId(component.id);
    setSelectedFailureModes([]); // Clear autopopulate selection when editing
  };

  const handleRemove = async (componentId) => {
    if (!window.confirm("Are you sure you want to remove this component? This will also remove all associated failure modes.")) {
      return;
    }

    try {
      await deleteComponent(componentId);
      await loadComponents();
      setSuccess("Component removed successfully!");
      showToast("success", "Component removed successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Failed to remove component:", error);
      setError("Failed to remove component. Please try again.");
      showToast("error", "Failed to remove component. Please try again.");
    }
  };

  if (!currentProject) {
    return (
      <div className={styles.noProject}>
        <h2>No Project Selected</h2>
        <p>Please create or load a project first to manage Components.</p>
        <button
          className={styles.backBtn}
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backdrop}></div>

      <div className={styles.header}>
        <h2>Components Management</h2>
        <p className={styles.projectInfo}>
          Project: <span className={styles.projectName}>{currentProject.name}</span>
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>🆔</span>
              Component ID
            </label>
            <input
              name="comp_id"
              value={form.comp_id}
              onChange={handleChange}
              placeholder="e.g., C001, C002, MCU_MAIN"
              className={styles.input}
              required
            />
            <p className={styles.helpText}>Enter a unique identifier for this component</p>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>🔧</span>
              Component Type
            </label>
            <CustomSelect
              value={form.type}
              onChange={(value) => {
                setForm(prev => ({ ...prev, type: value }));
                setSelectedFailureModes([]);
              }}
              options={COMPONENT_TYPE_SUGGESTIONS}
              placeholder="Select component type..."
              className={styles.customSelect}
            />
            <p className={styles.helpText}>
              Specify the type or category of component. Common types include: Resistor, Capacitor, IC, Microcontroller, Sensor, etc.
            </p>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>📊</span>
              Failure Rate (FIT)
            </label>
            <input
              name="failure_rate"
              type="number"
              step="0.01"
              min="0"
              value={form.failure_rate}
              onChange={handleChange}
              placeholder="e.g., 100, 250.5"
              className={styles.input}
              required
            />
            <p className={styles.helpText}>Failure rate in FIT (Failures In Time per billion hours)</p>
          </div>
        </div>

        {/* Autopopulate Preview Section */}
        {form.type && form.failure_rate && predefinedFMs.length > 0 && (
          <div className={styles.autopopulateSection}>
            <div className={styles.autopopulateHeader}>
              <span className={styles.autopopulateIcon}>🎯</span>
              <h3 className={styles.autopopulateTitle}>Auto-Populate Failure Modes</h3>
            </div>
            <p className={styles.autopopulateDescription}>
              Based on your selected component type <strong>{form.type}</strong> and failure rate <strong>{form.failure_rate} FIT</strong>,
              select which predefined failure modes you want to create automatically:
            </p>

            <div className={styles.autopopulatePreview}>
              <div className={styles.autopopulatePreviewTitle}>
                <span className={styles.autopopulatePreviewIcon}>📋</span>
                Select Failure Modes to Auto-Create
                <div className={styles.autopopulateActions}>
                  <button
                    type="button"
                    className={styles.autopopulateActionBtn}
                    onClick={handleSelectAllFailureModes}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className={styles.autopopulateActionBtn}
                    onClick={handleClearAllFailureModes}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className={styles.autopopulateList}>
                {predefinedFMs.map((fm, index) => {
                  const actualFitRate = parseFloat(form.failure_rate) * (fm.fit_rate / 100);
                  const isSelected = selectedFailureModes.includes(index);
                  return (
                    <div
                      key={index}
                      className={`${styles.autopopulateItem} ${isSelected ? styles.selected : ''}`}
                      onClick={() => handleFailureModeToggle(index)}
                    >
                      <input
                        type="checkbox"
                        id={`fm-checkbox-${index}`}
                        checked={isSelected}
                        onChange={() => handleFailureModeToggle(index)}
                        className={styles.autopopulateCheckbox}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label htmlFor={`fm-checkbox-${index}`} className={styles.autopopulateItemLabel}>
                        <span className={styles.autopopulateItemIcon}>⚡</span>
                        <div className={styles.autopopulateItemContent}>
                          <div className={styles.autopopulateItemDescription}>{fm.description}</div>
                          <div className={styles.autopopulateItemDetails}>{fm.system_effect}</div>
                        </div>
                        <div className={styles.autopopulateItemFit}>
                          {fm.fit_rate}% = {actualFitRate.toFixed(2)} FIT
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>🎯</span>
              Related Safety Functions
            </label>
            <div className={styles.sfSelector}>
              <div className={styles.sfHeader}>
                <span>Select which safety functions this component supports:</span>
                <div className={styles.sfActions}>
                  <button
                    type="button"
                    className={styles.sfActionBtn}
                    onClick={handleSelectAllSFs}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className={styles.sfActionBtn}
                    onClick={handleClearAllSFs}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className={styles.sfGrid}>
                {safetyFunctions.map((sf) => (
                  <label key={sf.id} className={styles.sfOption}>
                    <input
                      type="checkbox"
                      checked={form.related_sfs.includes(sf.id)}
                      onChange={() => handleSafetyFunctionToggle(sf.id)}
                      className={styles.sfCheckbox}
                    />
                    <div className={styles.sfCard}>
                      <div className={styles.sfId}>{sf.sf_id}</div>
                      <div className={styles.sfDescription}>{sf.description}</div>
                      <div className={styles.sfAsil}>{sf.target_integrity_level}</div>
                    </div>
                  </label>
                ))}
              </div>
              {safetyFunctions.length === 0 && (
                <div className={styles.sfEmpty}>
                  <p>No Safety Functions available. Please add Safety Functions first.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                name="is_safety_related"
                type="checkbox"
                checked={form.is_safety_related}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>
                <span className={styles.checkboxIcon}>🛡️</span>
                Safety Related Component
              </span>
            </label>
            <p className={styles.helpText}>
              Check if this component is directly involved in safety-critical functions
            </p>
          </div>
        </div>

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
              {isLoading ? "Adding..." : (editingId ? "Update Component" : "Add Component")}
            </span>
          </RippleButton>

          {editingId && (
            <RippleButton
              type="button"
              className={styles.cancelBtn}
              onClick={() => {
                setForm({
                  comp_id: "",
                  type: "",
                  failure_rate: "",
                  is_safety_related: false,
                  related_sfs: [],
                });
                setEditingId(null);
              }}
            >
              <span className={styles.btnIcon}>❌</span>
              <span>Cancel</span>
            </RippleButton>
          )}
        </div>
      </form>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h3>Components ({components.length})</h3>
          {components.length > 0 && (
            <RippleButton
              className={styles.continueBtn}
              onClick={handleContinue}
            >
              <span className={styles.btnIcon}>🚀</span>
              <span>Continue to Failure Modes</span>
              <span className={styles.btnArrow}>→</span>
            </RippleButton>
          )}
        </div>

        {components.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔧</div>
            <h4>No Components Defined</h4>
            <p>Add your first Component above to get started with your FMEDA analysis.</p>
            <p>Components represent the hardware elements that make up your safety-critical system.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Failure Rate (FIT)</th>
                <th>Safety Related</th>
                <th>Related Safety Functions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {components.map((comp) => (
                <tr key={comp.id}>
                  <td className={styles.compId}>{comp.comp_id}</td>
                  <td className={styles.type}>{comp.type}</td>
                  <td className={styles.failureRate}>{comp.failure_rate}</td>
                  <td className={styles.safetyRelated}>
                    {comp.is_safety_related ? "✅ Yes" : "❌ No"}
                  </td>
                  <td className={styles.relatedSfs}>
                    {comp.related_sfs && comp.related_sfs.length > 0
                      ? comp.related_sfs.map(sfId => {
                        const sf = safetyFunctions.find(s => s.id === sfId);
                        return sf ? sf.sf_id : null;
                      }).filter(Boolean).join(", ")
                      : "-"}
                  </td>
                  <td className={styles.actions}>
                    <RippleButton className={styles.editBtn} title="Edit Component" onClick={() => handleEdit(comp)}>
                      <span className={styles.btnIcon}>✏️</span>
                      <span>Edit</span>
                    </RippleButton>
                    <RippleButton className={styles.removeBtn} title="Remove Component" onClick={() => handleRemove(comp.id)}>
                      <span className={styles.btnIcon}>🗑️</span>
                      <span>Remove</span>
                    </RippleButton>
                    <RippleButton
                      className={styles.fmBtn}
                      title="Component Failure Modes"
                      onClick={() => handleFailureModes(comp.id)}
                    >
                      <span className={styles.btnIcon}>🔧</span>
                      <span>Failure Modes</span>
                    </RippleButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Import BOM removed as requested */}
    </div>
  );
}
