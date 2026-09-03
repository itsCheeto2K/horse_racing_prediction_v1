import React, { useState, useEffect } from 'react';
import Navbar, { getLocalDateString } from './components/Navbar';
import MeetingSelector from './components/MeetingSelector';
import RaceHeader from './components/RaceHeader';
import RaceMapVisualizer from './components/RaceMapVisualizer';
import PredictionMatrix from './components/PredictionMatrix';
import ModelTuner from './components/ModelTuner';
import RunnerModal from './components/RunnerModal';
import MonteCarloStats from './components/MonteCarloStats';
import AIAnalystPanel from './components/AIAnalystPanel';
import PostRaceLearningModal from './components/PostRaceLearningModal';
import AIMemoryModal from './components/AIMemoryModal';
import { 
  fetchHealth, 
  fetchMeetings, 
  fetchRaceAndPrediction, 
  simulateCustomWeights,
  analyzeRaceWithAI,
  fetchAIMemory
} from './services/api';
import { AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function App() {
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString(new Date()));
  const [raceCode, setRaceCode] = useState('gallops');
  const [healthStatus, setHealthStatus] = useState(null);

  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedRaceNumber, setSelectedRaceNumber] = useState(1);

  const [raceData, setRaceData] = useState(null);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [isLoadingRace, setIsLoadingRace] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState(null);

  // Modal inspection state
  const [modalRunner, setModalRunner] = useState(null);
  const [modalPrediction, setModalPrediction] = useState(null);

  // AI Analyst state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isPostRaceModalOpen, setIsPostRaceModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);

  // Load memory count on mount
  const refreshMemoryCount = () => {
    fetchAIMemory()
      .then((data) => {
        setMemoryCount(data.lessons?.length || 0);
      })
      .catch((err) => console.warn('Could not load memory count:', err));
  };

  // Check backend health on mount
  useEffect(() => {
    fetchHealth()
      .then(setHealthStatus)
      .catch((err) => console.warn('Health check warning:', err));
    refreshMemoryCount();
  }, []);

  // Load meetings when date or raceCode changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingMeetings(true);
    setError(null);
    setRaceData(null);

    fetchMeetings(selectedDate, raceCode)
      .then((data) => {
        if (isCancelled) return;
        const list = data.meetings || [];
        setMeetings(list);

        if (list.length > 0) {
          const first = list[0];
          setSelectedMeeting(first);
          const firstRaceNum = first.races && first.races.length > 0 ? first.races[0].raceNumber : 1;
          setSelectedRaceNumber(firstRaceNum);
        } else {
          setSelectedMeeting(null);
          setSelectedRaceNumber(1);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Error fetching meetings:', err);
        setError(err.message || 'Failed to fetch meetings');
        setMeetings([]);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingMeetings(false);
      });

    return () => { isCancelled = true; };
  }, [selectedDate, raceCode]);

  // Load race data & predictions when selectedMeeting or selectedRaceNumber changes
  useEffect(() => {
    if (!selectedMeeting) return;

    let isCancelled = false;
    setIsLoadingRace(true);
    setError(null);

    const trackSlug = selectedMeeting.slug || selectedMeeting.track;
    const country = selectedMeeting.country || null;
    const selectedRace = selectedMeeting.races?.find(r => r.raceNumber === selectedRaceNumber);
    const timezone = selectedRace?.timezone || selectedMeeting.timezone || null;

    fetchRaceAndPrediction(selectedDate, trackSlug, selectedRaceNumber, raceCode, 10000, country, timezone)
      .then((res) => {
        if (isCancelled) return;
        setRaceData(res);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Error fetching race predictions:', err);
        setError(`Failed to load race form: ${err.message}`);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingRace(false);
      });

    return () => { isCancelled = true; };
  }, [selectedMeeting, selectedRaceNumber, selectedDate, raceCode]);

  // Reset AI analysis when switching races
  useEffect(() => {
    setAiAnalysis(null);
  }, [selectedMeeting, selectedRaceNumber, selectedDate]);

  const handleSelectRace = (meeting, raceNumber) => {
    setSelectedMeeting(meeting);
    setSelectedRaceNumber(raceNumber);
  };

  const handleGenerateAI = async () => {
    if (!raceData || !raceData.form || !raceData.prediction) return;
    setIsLoadingAI(true);
    try {
      const res = await analyzeRaceWithAI(raceData.form, raceData.prediction);
      setAiAnalysis(res);

      // Map AI calibrated formula scores and interpretations directly into the main prediction table
      if (raceData.prediction?.predictions) {
        const calibratedMap = {};
        if (res.calibratedRunners && Array.isArray(res.calibratedRunners)) {
          res.calibratedRunners.forEach((cr) => {
            if (cr.runnerName) calibratedMap[cr.runnerName.toLowerCase()] = cr;
            if (cr.runnerNumber) calibratedMap[cr.runnerNumber] = cr;
          });
        }

        const enrichedPredictions = raceData.prediction.predictions.map((p) => {
          const aiData = res.runnerInterpretations?.[p.runnerName];
          const cal = calibratedMap[p.runnerName?.toLowerCase()] || calibratedMap[p.runnerNumber];

          let updated = { ...p };

          if (cal) {
            const winProb = cal.compositeWinProbability !== undefined ? cal.compositeWinProbability : p.compositeWinProbability;
            const fairOdds = cal.compositeFairOdds || (winProb > 0 ? Number((1 / winProb).toFixed(2)) : p.compositeFairOdds);
            const marketOdds = p.marketOdds || fairOdds;
            const valueEdge = (marketOdds && winProb) ? Number(((marketOdds * winProb) - 1).toFixed(4)) : p.valueEdge;

            updated = {
              ...updated,
              compositeWinProbability: winProb,
              winProbability: winProb,
              compositePlaceProbability: cal.compositePlaceProbability !== undefined ? cal.compositePlaceProbability : p.compositePlaceProbability,
              placeProbability: cal.compositePlaceProbability !== undefined ? cal.compositePlaceProbability : p.placeProbability,
              compositeFairOdds: fairOdds,
              fairOdds: fairOdds,
              compositeRank: cal.compositeRank !== undefined ? cal.compositeRank : p.compositeRank,
              rank: cal.compositeRank !== undefined ? cal.compositeRank : p.rank,
              tier: cal.tier || p.tier,
              verdict: cal.verdict || p.verdict,
              valueEdge: valueEdge,
              valueGrade: valueEdge > 0.15 ? 'High Value' : valueEdge > 0.05 ? 'Good Value' : 'Fair',
              subScores: cal.subScores ? { ...p.subScores, ...cal.subScores } : p.subScores,
              isAICalibrated: true
            };
          }

          if (aiData) {
            updated.horseCard = {
              ...updated.horseCard,
              aiInterpretation: aiData.interpretation,
              keyAdvantage: aiData.keyAdvantage,
              keyRisk: aiData.keyRisk,
              tacticalRole: aiData.tacticalRole,
              verdict: updated.verdict || updated.horseCard?.verdict
            };
          }

          return updated;
        });

        // Re-sort table by AI-calibrated rank
        enrichedPredictions.sort((a, b) => {
          if (a.isScratched !== b.isScratched) return a.isScratched ? 1 : -1;
          return (a.compositeRank || 999) - (b.compositeRank || 999);
        });

        setRaceData((prev) => ({
          ...prev,
          prediction: {
            ...prev.prediction,
            predictions: enrichedPredictions,
            isAICalibrated: true
          }
        }));
      }
    } catch (err) {
      console.error('AI Generation error:', err);
      alert(`AI Analysis error: ${err.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleReSimulate = async (weights, simulations) => {
    if (!selectedMeeting) return;
    setIsSimulating(true);
    try {
      const trackSlug = selectedMeeting.slug || selectedMeeting.track;
      const country = selectedMeeting.country || null;
      const selectedRace = selectedMeeting.races?.find(r => r.raceNumber === selectedRaceNumber);
      const timezone = selectedRace?.timezone || selectedMeeting.timezone || null;

      const res = await simulateCustomWeights(
        selectedDate,
        trackSlug,
        selectedRaceNumber,
        raceCode,
        weights,
        simulations,
        country,
        timezone
      );
      setRaceData(res);
    } catch (err) {
      console.error('Simulation error:', err);
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleInspectRunner = (rawRunner, prediction) => {
    setModalRunner(rawRunner);
    setModalPrediction(prediction);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        raceCode={raceCode}
        onRaceCodeChange={setRaceCode}
        healthStatus={healthStatus}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-4 flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              onClick={() => setSelectedDate(selectedDate)}
              className="px-3 py-1 bg-red-900/60 hover:bg-red-800 rounded-lg text-xs font-mono text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Meeting & Race Selector Bar */}
        <MeetingSelector
          meetings={meetings}
          selectedMeeting={selectedMeeting}
          selectedRaceNumber={selectedRaceNumber}
          onSelectRace={handleSelectRace}
          isLoading={isLoadingMeetings}
        />

        {/* Race Details & Prediction Engine Body */}
        {isLoadingRace ? (
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3 animate-pulse">
            <RefreshCw className="w-8 h-8 mx-auto text-amber-400 animate-spin" />
            <p className="font-bold text-white text-base">Running C++ OOP Prediction & Monte Carlo Engine...</p>
            <p className="text-xs text-slate-500 font-mono">Executing 10,000 stochastic race simulations on FormFav runner data</p>
          </div>
        ) : raceData ? (
          <div className="space-y-6">
            {/* Race Header Banner */}
            <RaceHeader
              formData={raceData.form}
              predictionData={raceData.prediction}
            />

            {/* Gemini AI Analyst Strategy & Memory Panel */}
            <AIAnalystPanel
              aiAnalysis={aiAnalysis}
              isLoadingAI={isLoadingAI}
              onGenerateAI={handleGenerateAI}
              onOpenPostRaceModal={() => setIsPostRaceModalOpen(true)}
              onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
              memoryCount={memoryCount}
            />

            {/* Grid Layout: Main Matrix + Side Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Race Map Visualizer & Ranked Prediction Matrix (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <RaceMapVisualizer
                  raceMap={raceData.prediction?.raceMap}
                  predictions={raceData.prediction?.predictions}
                />

                <PredictionMatrix
                  predictions={raceData.prediction?.predictions}
                  rawRunners={raceData.form?.runners}
                  onSelectRunner={handleInspectRunner}
                />
              </div>

              {/* Right Column: Model Tuner Studio & Monte Carlo Stats (1/3 width) */}
              <div className="space-y-6">
                <ModelTuner
                  currentWeights={raceData.prediction?.appliedWeights}
                  distanceCategory={raceData.prediction?.distanceCategory}
                  isDynamicWeights={raceData.prediction?.isDynamicWeights}
                  onReSimulate={handleReSimulate}
                  isSimulating={isSimulating}
                />

                <MonteCarloStats
                  predictionData={raceData.prediction}
                />
              </div>

            </div>
          </div>
        ) : !isLoadingMeetings && meetings.length > 0 ? (
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <p>Select a race from the meeting list above to view predictions.</p>
          </div>
        ) : null}

      </main>

      {/* Runner Detailed Inspection Modal */}
      {modalRunner || modalPrediction ? (
        <RunnerModal
          runner={modalRunner}
          prediction={modalPrediction}
          onClose={() => {
            setModalRunner(null);
            setModalPrediction(null);
          }}
        />
      ) : null}

      {/* Post-Race Result & AI Self-Learning Modal */}
      <PostRaceLearningModal
        isOpen={isPostRaceModalOpen}
        onClose={() => setIsPostRaceModalOpen(false)}
        raceData={raceData}
        onLearningCompleted={(result) => {
          refreshMemoryCount();
        }}
      />

      {/* AI Knowledge Base / Memory Modal */}
      <AIMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        onMemoryUpdated={refreshMemoryCount}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0f172a] py-6 text-center text-xs text-slate-500 font-mono">
        <p>HorseRacing Live &bull; C++ Object-Oriented Simulation Engine &bull; FormFav REST API</p>
      </footer>
    </div>
  );
}
