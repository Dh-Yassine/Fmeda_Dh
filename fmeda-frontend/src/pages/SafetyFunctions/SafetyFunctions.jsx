import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./SafetyFunctions.module.css";
import RippleButton from "../../components/RippleButton";
import {
  getSafetyFunctions,
  createSafetyFunction,
  updateSafetyFunction,
  deleteSafetyFunction,
} from "../../api/fmedaApi";

export default function SafetyFunctions({ currentProject }) {
  const [safetyFunctions, setSafetyFunctions] = useState([]);
  const [form, setForm] = useState({ sf_id: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Load safety functions for current project
  useEffect(() => {
    if (currentProject) {
      loadSafetyFunctions();
    }
  }, [currentProject]);

  const loadSafetyFunctions = async () => {
    if (!currentProject) return;
    
    try {
      const data = await getSafetyFunctions(currentProject.id);
      setSafetyFunctions(data);
    } catch (error) {
      console.error("Failed to load safety functions:", error);
      setError("Failed to load safety functions.");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentProject) {
      setError("No project selected. Please create or load a project first.");
      return;
    }

    if (!form.sf_id.trim()) {
      setError("Safety Function ID is required.");
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      if (editingId) {
        await updateSafetyFunction(editingId, form);
      } else {
        await createSafetyFunction({
          ...form,
          project: currentProject.id
        });
      }
      setForm({ sf_id: "", description: "" });
      setEditingId(null);
      await loadSafetyFunctions();
    } catch (error) {
      setError("Failed to save safety function. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (sf) => {
    setForm({
      sf_id: sf.sf_id,
      description: sf.description || "",
    });
    setEditingId(sf.id);
  };

  const handleDelete = async (sfId) => {
    if (window.confirm("Delete this Safety Function?")) {
      try {
        await deleteSafetyFunction(sfId);
        await loadSafetyFunctions();
      } catch (error) {
        setError("Failed to delete safety function.");
      }
    }
  };

  const handleContinue = () => {
    if (safetyFunctions.length > 0) {
      navigate("/components");
    } else {
      alert("Please add at least one Safety Function before continuing.");
    }
  };

  if (!currentProject) {
    return (
      <div className={styles.noProject}>
        <h2>No Project Selected</h2>
        <p>Please create or load a project first to manage Safety Functions.</p>
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
        <h2>Safety Functions</h2>
        <p className={styles.projectInfo}>
          Project: <span className={styles.projectName}>{currentProject.name}</span>
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>🆔</span>
              Safety Function ID
            </label>
            <input
              name="sf_id"
              placeholder="e.g., SF001, SF002, SF_MAIN"
              value={form.sf_id}
              onChange={handleChange}
              className={styles.input}
              required
            />
            <p className={styles.helpText}>Enter a unique identifier for this safety function</p>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>📝</span>
              Description (optional)
            </label>
            <textarea
              name="description"
              placeholder="Optionally describe the safety function, its purpose, and requirements..."
              value={form.description}
              onChange={handleChange}
              className={styles.textarea}
              rows="4"
            />
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
              {isLoading ? "Saving..." : (editingId ? "Update Safety Function" : "Add Safety Function")}
            </span>
          </RippleButton>
          {editingId && (
            <RippleButton
              type="button"
              className={styles.cancelBtn}
              onClick={() => {
                setForm({ sf_id: "", description: "" });
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

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h3>Safety Functions ({safetyFunctions.length})</h3>
          {safetyFunctions.length > 0 && (
            <RippleButton className={styles.continueBtn} onClick={handleContinue}>
              <span className={styles.btnIcon}>🚀</span>
              <span>Continue to Components</span>
              <span className={styles.btnArrow}>→</span>
            </RippleButton>
          )}
        </div>

        {safetyFunctions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h4>No Safety Functions Defined</h4>
            <p>Add your first Safety Function above to get started with your FMEDA analysis.</p>
            <p>Safety Functions define the critical safety requirements that your system must meet.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {safetyFunctions.map((sf, i) => (
                  <motion.tr
                    key={sf.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className={styles.tableRow}
                  >
                    <td className={styles.sfId}>{sf.sf_id}</td>
                    <td className={styles.description}>{sf.description || "—"}</td>
                    <td className={styles.actions}>
                      <RippleButton className={styles.editBtn} onClick={() => handleEdit(sf)} title="Edit">
                        <span className={styles.btnIcon}>✏️</span>
                        <span>Edit</span>
                      </RippleButton>
                      <RippleButton className={styles.deleteBtn} onClick={() => handleDelete(sf.id)} title="Delete">
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
    </div>
  );
}
