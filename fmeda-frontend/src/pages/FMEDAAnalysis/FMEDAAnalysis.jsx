import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./FMEDAAnalysis.module.css";
import RippleButton from "../../components/RippleButton";
import { 
  getSafetyFunctions, 
  getComponents,
  getTotalFailureModeCount,
  calculateFMEDA 
} from "../../api/fmedaApi";

// Utility function to format small numbers in scientific notation
const formatSmallNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  if (value === 0) {
    return '0';
  }
  
  if (Math.abs(value) < 0.000001) {
    return value.toExponential(2);
  }
  
  if (Math.abs(value) < 0.01) {
    return value.toExponential(3);
  }
  
  return value.toFixed(6);
};

export default function FMEDAAnalysis({ currentProject }) {
  const [safetyFunctions, setSafetyFunctions] = useState([]);
  const [components, setComponents] = useState([]);
  const [failureModeCount, setFailureModeCount] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  const loadData = async () => {
    if (!currentProject) return;
    
    try {
      const [sfData, compData, fmCount] = await Promise.all([
        getSafetyFunctions(currentProject.id),
        getComponents(currentProject.id),
        getTotalFailureModeCount(currentProject.id)
      ]);
      setSafetyFunctions(sfData);
      setComponents(compData);
      setFailureModeCount(fmCount);
    } catch (error) {
      console.error("Failed to load data:", error);
      setError("Failed to load project data.");
    }
  };

  const handleCalculateFMEDA = async () => {
    if (!currentProject) {
      setError("No project selected.");
      return;
    }

    if (safetyFunctions.length === 0) {
      setError("No Safety Functions defined. Please add Safety Functions first.");
      return;
    }

    if (components.length === 0) {
      setError("No Components defined. Please add Components first.");
      return;
    }

    setIsCalculating(true);
    setError("");

    try {
      const results = await calculateFMEDA(currentProject.id);
      setAnalysisResults(results);
    } catch (error) {
      console.error("Failed to calculate FMEDA:", error);
      setError("Failed to calculate FMEDA. Please check your data and try again.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleViewResults = () => {
    navigate("/results");
  };

  const handleBackToFailureModes = () => {
    navigate("/failure-modes");
  };

  if (!currentProject) {
    return (
      <div className={styles.container}>
        <div className={styles.backdrop}></div>
        <div className={styles.noProject}>
          <h2>⚠️ No Project Selected</h2>
          <p>Please create or load a project first to perform FMEDA analysis.</p>
          <button className={styles.backBtn} onClick={() => navigate("/")}>
            <span className={styles.btnIcon}>🏠</span>
            <span>Go to Home</span>
          </button>
        </div>
      </div>
    );
  }

  const hasData = safetyFunctions.length > 0 && components.length > 0;
  const canCalculate = hasData && currentProject.lifetime > 0;

  return (
    <div className={styles.container}>
      <div className={styles.backdrop}></div>
      
      <div className={styles.header}>
        <h2>📊 FMEDA Analysis</h2>
        <p className={styles.projectInfo}>
          Project: <span className={styles.projectName}>{currentProject.name}</span>
        </p>
      </div>

      <div className={styles.overviewSection}>
        <div className={styles.sectionHeader}>
          <h3>📋 Project Overview</h3>
          <p>Review your project data before running FMEDA analysis</p>
        </div>

        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}>
            <div className={styles.cardIcon}>📋</div>
            <div className={styles.cardContent}>
              <h4>System Lifetime</h4>
              <p className={styles.cardValue}>
                {currentProject.lifetime ? `${currentProject.lifetime.toLocaleString()} hours` : "Not set"}
              </p>
              <p className={styles.cardStatus}>
                {currentProject.lifetime > 0 ? "✅ Ready" : "❌ Required"}
              </p>
            </div>
          </div>

          <div className={styles.overviewCard}>
            <div className={styles.cardIcon}>⚡</div>
            <div className={styles.cardContent}>
              <h4>Safety Functions</h4>
              <p className={styles.cardValue}>{safetyFunctions.length}</p>
              <p className={styles.cardStatus}>
                {safetyFunctions.length > 0 ? "✅ Ready" : "❌ Required"}
              </p>
            </div>
          </div>

          <div className={styles.overviewCard}>
            <div className={styles.cardIcon}>🔧</div>
            <div className={styles.cardContent}>
              <h4>Components</h4>
              <p className={styles.cardValue}>{components.length}</p>
              <p className={styles.cardStatus}>
                {components.length > 0 ? "✅ Ready" : "❌ Required"}
              </p>
            </div>
          </div>

          <div className={styles.overviewCard}>
            <div className={styles.cardIcon}>🔍</div>
            <div className={styles.cardContent}>
              <h4>Failure Modes</h4>
              <p className={styles.cardValue}>{failureModeCount}</p>
              <p className={styles.cardStatus}>
                {failureModeCount > 0 ? "✅ Ready" : "⚠️ Recommended"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!hasData && (
        <div className={styles.warningSection}>
          <div className={styles.warningIcon}>⚠️</div>
          <h3>Missing Data</h3>
          <p>Please ensure you have defined Safety Functions and Components before running FMEDA analysis.</p>
          <div className={styles.warningActions}>
            <RippleButton className={styles.warningBtn} onClick={() => navigate("/safety-functions")}>
              <span className={styles.btnIcon}>⚡</span>
              <span>Add Safety Functions</span>
            </RippleButton>
            <RippleButton className={styles.warningBtn} onClick={() => navigate("/components")}>
              <span className={styles.btnIcon}>🔧</span>
              <span>Add Components</span>
            </RippleButton>
          </div>
        </div>
      )}

      {!currentProject.lifetime && (
        <div className={styles.warningSection}>
          <div className={styles.warningIcon}>⚠️</div>
          <h3>System Lifetime Not Set</h3>
          <p>Please set the system lifetime in the Assumptions page before running FMEDA analysis.</p>
          <RippleButton className={styles.warningBtn} onClick={() => navigate("/assumptions")}>
            <span className={styles.btnIcon}>📋</span>
            <span>Set System Lifetime</span>
          </RippleButton>
        </div>
      )}

      {canCalculate && (
        <div className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h3>🚀 Run FMEDA Analysis</h3>
            <p>Calculate safety metrics for all Safety Functions</p>
          </div>

          <div className={styles.analysisInfo}>
            <div className={styles.infoCard}>
              <h4>What will be calculated:</h4>
              <ul>
                <li><strong>SPFM</strong> - Single Point Fault Metric</li>
                <li><strong>LFM</strong> - Latent Fault Metric</li>
                <li><strong>MPHF</strong> - Multiple Point Hazardous Failure</li>
                <li><strong>RF</strong> - Residual Fault</li>
                <li><strong>MPFL</strong> - Multiple Point Fault Latent</li>
                <li><strong>MPFD</strong> - Multiple Point Fault Detected</li>
              </ul>
            </div>
          </div>

          <div className={styles.analysisActions}>
            <RippleButton
              className={styles.calculateBtn}
              onClick={handleCalculateFMEDA}
              disabled={isCalculating}
            >
              <span className={styles.btnIcon}>
                {isCalculating ? "⏳" : "🚀"}
              </span>
              <span>
                {isCalculating ? "Calculating..." : "Run FMEDA Analysis"}
              </span>
            </RippleButton>
            <RippleButton className={styles.backBtn} onClick={handleBackToFailureModes}>
              <span className={styles.btnIcon}>←</span>
              <span>Back to Failure Modes</span>
            </RippleButton>
          </div>
        </div>
      )}

      {analysisResults && (
        <div className={styles.resultsSection}>
          <div className={styles.sectionHeader}>
            <h3>✅ Analysis Complete</h3>
            <p>FMEDA analysis has been completed successfully</p>
          </div>

          <div className={styles.resultsSummary}>
            <div className={styles.summaryCard}>
              <h4>📊 Analysis Summary</h4>
              <p>Calculated metrics for {analysisResults.length} Safety Function(s)</p>
              <div className={styles.summaryMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Total Safety Functions:</span>
                  <span className={styles.metricValue}>{analysisResults.length}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Total Components:</span>
                  <span className={styles.metricValue}>{components.length}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Total Failure Modes:</span>
                  <span className={styles.metricValue}>{failureModeCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Show actual calculated metrics prominently */}
          <div className={styles.calculatedMetrics}>
            <div className={styles.sectionHeader}>
              <h3>📈 Calculated Safety Metrics</h3>
              <p>Key safety metrics for each Safety Function</p>
            </div>

            <div className={styles.metricsGrid}>
              {analysisResults.map((result, index) => {
                const safetyFunction = safetyFunctions.find(sf => sf.id === result.safety_function);
                if (!safetyFunction) return null;

                return (
                  <div key={result.safety_function} className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                      <h4 className={styles.sfTitle}>{safetyFunction.sf_id}</h4>
                      <p className={styles.sfDescription}>{safetyFunction.description}</p>
                    </div>

                    <div className={styles.metricsDisplay}>
                      <div className={styles.metricItem}>
                        <div className={styles.metricLabel}>SPFM</div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(result.spfm)}%
                        </div>
                        <div className={styles.metricDescription}>Single Point Fault Metric</div>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricLabel}>LFM</div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(result.lfm)}%
                        </div>
                        <div className={styles.metricDescription}>Latent Fault Metric</div>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricLabel}>MPHF</div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(result.mphf)}
                        </div>
                        <div className={styles.metricDescription}>Multiple Point Hazardous Failure</div>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricLabel}>RF</div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(result.rf)} FIT
                        </div>
                        <div className={styles.metricDescription}>Residual Fault</div>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricLabel}>MPFL</div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(result.mpfl)} FIT
                        </div>
                        <div className={styles.metricDescription}>Multiple Point Fault Latent</div>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricLabel}>MPFD</div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(result.mpfd)} FIT
                        </div>
                        <div className={styles.metricDescription}>Multiple Point Fault Detected</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.resultsActions}>
            <button 
              className={styles.viewResultsBtn}
              onClick={handleViewResults}
            >
              <span className={styles.btnIcon}>📊</span>
              <span>View Detailed Results</span>
            </button>
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
} 