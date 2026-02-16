import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getSafetyFunctions, 
  getComponents,
  getProjectResults,
  getTotalFailureModeCount,
  exportProject
} from "../../api/fmedaApi";
import RippleButton from "../../components/RippleButton";
import styles from "./Results.module.css";

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

export default function Results({ currentProject }) {
  const [safetyFunctions, setSafetyFunctions] = useState([]);
  const [components, setComponents] = useState([]);
  const [results, setResults] = useState(null);
  const [failureModeCount, setFailureModeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentProject) {
      loadResults();
    }
  }, [currentProject]);

  const loadResults = async () => {
    if (!currentProject) return;
    
    try {
      setIsLoading(true);
      const [sfData, compData, resultsData, fmCount] = await Promise.all([
        getSafetyFunctions(currentProject.id),
        getComponents(currentProject.id),
        getProjectResults(currentProject.id),
        getTotalFailureModeCount(currentProject.id)
      ]);
      setSafetyFunctions(sfData);
      setComponents(compData);
      setResults(resultsData);
      setFailureModeCount(fmCount);
    } catch (error) {
      console.error("Failed to load results:", error);
      setError("Failed to load analysis results.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportResults = async () => {
    if (!currentProject) return;

    setIsExporting(true);
    setError("");

    try {
      await exportProject(currentProject);
    } catch (error) {
      console.error("Failed to export project:", error);
      setError("Failed to export project. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackToAnalysis = () => {
    navigate("/fmeda-analysis");
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  const getASILColor = (asil) => {
    switch (asil) {
      case 'A': return '#4caf50';
      case 'B': return '#ff9800';
      case 'C': return '#f57c00';
      case 'D': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getMetricStatus = (metric, value) => {
    if (metric === 'SPFM' || metric === 'LFM') {
      if (value >= 99) return { status: 'Excellent', color: '#4caf50' };
      if (value >= 90) return { status: 'Good', color: '#8bc34a' };
      if (value >= 60) return { status: 'Fair', color: '#ff9800' };
      return { status: 'Poor', color: '#f44336' };
    }
    return { status: 'N/A', color: '#9e9e9e' };
  };

  if (!currentProject) {
    return (
      <div className={styles.container}>
        <div className={styles.backdrop}></div>
        <div className={styles.noProject}>
          <h2>⚠️ No Project Selected</h2>
          <p>Please create or load a project first to view results.</p>
          <RippleButton className={styles.backBtn} onClick={() => navigate("/")}>
            <span className={styles.btnIcon}>🏠</span>
            <span>Go to Home</span>
          </RippleButton>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.backdrop}></div>
        <div className={styles.loading}>
          <div className={styles.loadingIcon}>⏳</div>
          <h3>Loading Results...</h3>
          <p>Please wait while we load your FMEDA analysis results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backdrop}></div>
      
      <div className={styles.header}>
        <h2>📊 FMEDA Analysis Results</h2>
        <p className={styles.projectInfo}>
          Project: <span className={styles.projectName}>{currentProject.name}</span>
        </p>
        <p className={styles.lifetimeInfo}>
          System Lifetime: <span className={styles.lifetimeValue}>{currentProject.lifetime?.toLocaleString()} hours</span>
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {results && (
        <>
          <div className={styles.summarySection}>
            <div className={styles.sectionHeader}>
              <h3>📈 Analysis Summary</h3>
              <p>Overview of your FMEDA analysis results</p>
            </div>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>⚡</div>
                <div className={styles.cardContent}>
                  <h4>Safety Functions</h4>
                  <p className={styles.cardValue}>{safetyFunctions.length}</p>
                  <p className={styles.cardDescription}>Total analyzed</p>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>🔧</div>
                <div className={styles.cardContent}>
                  <h4>Components</h4>
                  <p className={styles.cardValue}>{components.length}</p>
                  <p className={styles.cardDescription}>Total components</p>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>🔍</div>
                <div className={styles.cardContent}>
                  <h4>Failure Modes</h4>
                  <p className={styles.cardValue}>{failureModeCount}</p>
                  <p className={styles.cardDescription}>Total failure modes</p>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.cardIcon}>📊</div>
                <div className={styles.cardContent}>
                  <h4>Metrics Calculated</h4>
                  <p className={styles.cardValue}>7</p>
                  <p className={styles.cardDescription}>SPFM, LFM, MPHF, RF, MPFL, MPFD, Safety Related</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.resultsSection}>
            <div className={styles.sectionHeader}>
              <h3>📋 Detailed Results</h3>
              <p>Safety metrics for each Safety Function</p>
            </div>

            <div className={styles.resultsGrid}>
              {safetyFunctions.map((sf) => {
                const sfResults = results.find(r => r.safety_function === sf.id);
                if (!sfResults) return null;

                const spfmStatus = getMetricStatus('SPFM', sfResults.spfm);
                const lfmStatus = getMetricStatus('LFM', sfResults.lfm);

                return (
                  <div key={sf.id} className={styles.resultCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.sfInfo}>
                        <h4 className={styles.sfId}>{sf.sf_id}</h4>
                        <p className={styles.sfDescription}>{sf.description}</p>
                      </div>
                      <div 
                        className={styles.asilBadge}
                        style={{ backgroundColor: getASILColor(sf.target_integrity_level) }}
                      >
                        ASIL {sf.target_integrity_level}
                      </div>
                    </div>

                    <div className={styles.metricsGrid}>
                      <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                          <span className={styles.metricLabel}>SPFM</span>
                          <span 
                            className={styles.metricStatus}
                            style={{ color: spfmStatus.color }}
                          >
                            {spfmStatus.status}
                          </span>
                        </div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(sfResults.spfm)}%
                        </div>
                        <p className={styles.metricDescription}>
                          Single Point Fault Metric
                        </p>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                          <span className={styles.metricLabel}>LFM</span>
                          <span 
                            className={styles.metricStatus}
                            style={{ color: lfmStatus.color }}
                          >
                            {lfmStatus.status}
                          </span>
                        </div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(sfResults.lfm)}%
                        </div>
                        <p className={styles.metricDescription}>
                          Latent Fault Metric
                        </p>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                          <span className={styles.metricLabel}>MPHF</span>
                        </div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(sfResults.mphf)}
                        </div>
                        <p className={styles.metricDescription}>
                          Multiple Point Hazardous Failure
                        </p>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                          <span className={styles.metricLabel}>RF</span>
                        </div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(sfResults.rf)} FIT
                        </div>
                        <p className={styles.metricDescription}>
                          Residual Fault
                        </p>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                          <span className={styles.metricLabel}>MPFL</span>
                        </div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(sfResults.mpfl)} FIT
                        </div>
                        <p className={styles.metricDescription}>
                          Multiple Point Fault Latent
                        </p>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                          <span className={styles.metricLabel}>MPFD</span>
                        </div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(sfResults.mpfd)} FIT
                        </div>
                        <p className={styles.metricDescription}>
                          Multiple Point Fault Detected
                        </p>
                      </div>

                      <div className={styles.metricItem}>
                        <div className={styles.metricHeader}>
                          <span className={styles.metricLabel}>Safety Related</span>
                        </div>
                        <div className={styles.metricValue}>
                          {formatSmallNumber(sfResults.safetyrelated)} FIT
                        </div>
                        <p className={styles.metricDescription}>
                          Sum of safety related component failure rates
                        </p>
                      </div>
                    </div>

                    <div className={styles.componentsInfo}>
                      <h5>Related Components</h5>
                      <div className={styles.componentsList}>
                        {components
                          .filter(comp => comp.related_sfs?.some(relatedSf => relatedSf.id === sf.id))
                          .map((comp, index) => (
                            <span key={comp.id} className={styles.componentTag}>
                              {comp.comp_id} ({comp.type})
                            </span>
                          ))}
                        {components.filter(comp => comp.related_sfs?.some(relatedSf => relatedSf.id === sf.id)).length === 0 && (
                          <span className={styles.noComponents}>No components assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.exportSection}>
            <div className={styles.sectionHeader}>
              <h3>💾 Export Results</h3>
              <p>Download your analysis results for reporting</p>
            </div>

            <div className={styles.exportActions}>
              <RippleButton
                className={styles.exportBtn}
                onClick={handleExportResults}
                disabled={isExporting}
              >
                <span className={styles.btnIcon}>
                  {isExporting ? "⏳" : "📄"}
                </span>
                <span>
                  {isExporting ? "Exporting..." : "Export to CSV"}
                </span>
              </RippleButton>
            </div>
          </div>
        </>
      )}

      {!results && !isLoading && (
        <div className={styles.noResults}>
          <div className={styles.noResultsIcon}>📊</div>
          <h3>No Analysis Results</h3>
          <p>No FMEDA analysis has been performed yet. Please run the analysis first.</p>
          <RippleButton className={styles.analysisBtn} onClick={handleBackToAnalysis}>
            <span className={styles.btnIcon}>🚀</span>
            <span>Run FMEDA Analysis</span>
          </RippleButton>
        </div>
      )}

      <div className={styles.navigationActions}>
        <RippleButton className={styles.backBtn} onClick={handleBackToAnalysis}>
          <span className={styles.btnIcon}>←</span>
          <span>Back to Analysis</span>
        </RippleButton>
        <RippleButton className={styles.homeBtn} onClick={handleBackToHome}>
          <span className={styles.btnIcon}>🏠</span>
          <span>Go to Home</span>
        </RippleButton>
      </div>
    </div>
  );
} 