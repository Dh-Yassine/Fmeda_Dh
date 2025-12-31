import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  importProject,
  exportProject,
  clearAllData
} from "../../api/fmedaApi";
import styles from "./Home.module.css";
import RippleButton from "../../components/RippleButton";
import { showToast } from "../../App";

export default function Home({ currentProject, setCurrentProject, clearProjectData }) {
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleNewProject = async () => {
    if (!newProjectName.trim()) {
      setError("Please enter a project name.");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      // Clear any existing project data in the UI state
      clearProjectData();

      const project = await createProject({ name: newProjectName.trim() });
      setCurrentProject(project);
      setNewProjectName("");

      // Navigate to assumptions page without page refresh
      navigate("/assumptions");
    } catch (error) {
      console.error("Failed to create project:", error);
      setError("Failed to create project. Please try again.");
      showToast("error", "Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleLoadProject = () => {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsImporting(true);
      setError("");

      try {
        const formData = new FormData();
        formData.append('file', file);

        const project = await importProject(formData);
        setCurrentProject(project);

        // Navigate to assumptions page without page refresh
        navigate("/assumptions");
      } catch (error) {
        console.error("Failed to import project:", error);
        setError("Failed to import project. Please check your CSV file format.");
        showToast("error", "Failed to import project. Please check your CSV file format.");
      } finally {
        setIsImporting(false);
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  const handleExportProject = async () => {
    if (!currentProject) {
      setError("No project selected.");
      return;
    }

    setIsExporting(true);
    setError("");

    try {
      await exportProject(currentProject);
    } catch (error) {
      console.error("Failed to export project:", error);
      setError("Failed to export project. Please try again.");
      showToast("error", "Failed to export project. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleHelp = () => {
    // TODO: Implement help functionality
    alert("Help documentation will be implemented soon!");
  };

  const handleClearAllData = async () => {
    if (window.confirm("This will delete ALL projects and data. Are you sure?")) {
      try {
        await clearAllData();
        setCurrentProject(null);
        alert("All data cleared successfully!");
        window.location.reload();
      } catch (error) {
        console.error("Error clearing data:", error);
        alert("Error clearing data. Please try again.");
        showToast("error", "Error clearing data. Please try again.");
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.backdrop}></div>

      {currentProject ? (
        <div className={styles.currentProject}>
          <div className={styles.projectHeader}>
            <h2>📋 Current Project</h2>
            <div className={styles.projectInfo}>
              <span className={styles.projectName}>{currentProject.name}</span>
              {currentProject.lifetime && (
                <span className={styles.lifetime}>
                  Lifetime: {currentProject.lifetime.toLocaleString()} hours
                </span>
              )}
            </div>
          </div>

          <div className={styles.projectActions}>
            <RippleButton
              className={styles.actionBtn}
              onClick={handleExportProject}
              disabled={isExporting}
            >
              <span className={styles.btnIcon}>
                {isExporting ? "⏳" : "💾"}
              </span>
              <span>
                {isExporting ? "Exporting..." : "Export Project"}
              </span>
            </RippleButton>

            <RippleButton
              className={styles.actionBtn}
              onClick={handleHelp}
            >
              <span className={styles.btnIcon}>❓</span>
              <span>Help</span>
            </RippleButton>

            <RippleButton
              className={styles.clearBtn}
              onClick={handleClearAllData}
            >
              <span className={styles.btnIcon}>🗑️</span>
              <span>Clear All Data</span>
            </RippleButton>
          </div>

          <div className={styles.workflowGuide}>
            <h3>🚀 Continue Your Analysis</h3>
            <div className={styles.workflowSteps}>
              <div className={styles.step}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepText}>Set System Lifetime</span>
                <RippleButton
                  className={styles.stepBtn}
                  onClick={() => navigate("/assumptions")}
                >
                  Go to Assumptions
                </RippleButton>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepText}>Define Safety Functions</span>
                <RippleButton
                  className={styles.stepBtn}
                  onClick={() => navigate("/safety-functions")}
                >
                  Go to Safety Functions
                </RippleButton>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepText}>Add Components</span>
                <RippleButton
                  className={styles.stepBtn}
                  onClick={() => navigate("/components")}
                >
                  Go to Components
                </RippleButton>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>4</span>
                <span className={styles.stepText}>Define Failure Modes</span>
                <RippleButton
                  className={styles.stepBtn}
                  onClick={() => navigate("/failure-modes")}
                >
                  Go to Failure Modes
                </RippleButton>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>5</span>
                <span className={styles.stepText}>Run FMEDA Analysis</span>
                <RippleButton
                  className={styles.stepBtn}
                  onClick={() => navigate("/fmeda-analysis")}
                >
                  Go to Analysis
                </RippleButton>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.welcomeSection}>
          <div className={styles.welcomeHeader}>
            <img src="/logo.png" alt="FMEDA Logo" className={styles.logoImg} />
            <h1>FMEDA Analysis Tool</h1>
            <p>Professional Failure Mode Effects and Diagnostic Analysis</p>
          </div>

          <div className={styles.actionCards}>
            <div className={styles.actionCard}>
              <div className={styles.cardIcon}>🆕</div>
              <h3>New Project</h3>
              <p>Start a fresh FMEDA analysis project</p>

              <div className={styles.projectForm}>
                <input
                  type="text"
                  placeholder="Enter project name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className={styles.projectInput}
                  onKeyPress={(e) => e.key === 'Enter' && handleNewProject()}
                />
                <RippleButton
                  className={styles.createBtn}
                  onClick={handleNewProject}
                  disabled={isCreating}
                >
                  <span className={styles.btnIcon}>
                    {isCreating ? "⏳" : "🚀"}
                  </span>
                  <span>
                    {isCreating ? "Creating..." : "Create Project"}
                  </span>
                </RippleButton>
              </div>
            </div>

            <div className={styles.actionCard}>
              <div className={styles.cardIcon}>📁</div>
              <h3>Load Project</h3>
              <p>Import an existing project from CSV file</p>
              <RippleButton
                className={styles.loadBtn}
                onClick={handleLoadProject}
                disabled={isImporting}
              >
                <span className={styles.btnIcon}>
                  {isImporting ? "⏳" : "📂"}
                </span>
                <span>
                  {isImporting ? "Importing..." : "Choose CSV File"}
                </span>
              </RippleButton>
            </div>
          </div>

          <div className={styles.featuresSection}>
            <h3>✨ Key Features</h3>
            <div className={styles.featuresGrid}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>⚡</span>
                <h4>Safety Functions</h4>
                <p>Define safety functions with ASIL levels</p>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🔧</span>
                <h4>Component Management</h4>
                <p>Add components and link to safety functions</p>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🔍</span>
                <h4>Failure Modes</h4>
                <p>Define failure modes with auto-population</p>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>📊</span>
                <h4>FMEDA Analysis</h4>
                <p>Calculate SPFM, LFM, MPHF, and more</p>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>📈</span>
                <h4>Results & Reports</h4>
                <p>View detailed analysis results</p>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>💾</span>
                <h4>Import/Export</h4>
                <p>Save and load projects as CSV files</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}