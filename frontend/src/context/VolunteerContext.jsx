import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getVolunteerByEmail,
  getRecommendations,
  getActiveTasks,
  getHistory,
  acceptTask as apiAcceptTask,
  updateTaskStatus as apiUpdateTaskStatus,
  updateVolunteer as apiUpdateVolunteer,
} from "../api";

const VolunteerContext = createContext(null);

export function VolunteerProvider({ firebaseUser, children }) {
  const [volunteer, setVolunteer]           = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [activeTasks, setActiveTasks]       = useState([]);
  const [history, setHistory]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  /* ── Fetch the MongoDB volunteer record by Firebase email ── */
  const loadVolunteer = useCallback(async () => {
    if (!firebaseUser?.email) return;
    try {
      const res = await getVolunteerByEmail(firebaseUser.email);
      setVolunteer(res.data);
      return res.data;
    } catch {
      setError("Could not load your profile. Please try again.");
      return null;
    }
  }, [firebaseUser?.email]);

  /* ── Fetch all data for a given MongoDB volunteer ── */
  const loadAll = useCallback(async (vol) => {
    if (!vol?._id) return;
    try {
      const [recRes, activeRes, histRes] = await Promise.all([
        getRecommendations(vol._id),
        getActiveTasks(vol._id),
        getHistory(vol._id),
      ]);
      setRecommendations(recRes.data || []);
      setActiveTasks(activeRes.data || []);
      setHistory(histRes.data || []);
    } catch {
      /* non-blocking — show empty states */
    }
  }, []);

  /* ── Bootstrap on mount ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const vol = await loadVolunteer();
      if (vol) await loadAll(vol);
      setLoading(false);
    })();
  }, [loadVolunteer, loadAll]);

  /* ── Actions ── */

  /** Optimistically accept a task */
  const acceptTask = async (issue) => {
    if (!volunteer?._id) throw new Error("Profile not loaded");

    // Optimistic: remove from recommendations immediately
    setRecommendations(prev => prev.filter(r => r._id !== issue._id));

    try {
      const res = await apiAcceptTask(issue._id, volunteer._id);
      const newAssignment = res.data;
      // Add to activeTasks with issue data attached
      setActiveTasks(prev => [{ ...newAssignment, issue }, ...prev]);
    } catch (err) {
      // Rollback
      setRecommendations(prev => [issue, ...prev]);
      throw err;
    }
  };

  /** Start a task (assigned → in_progress) */
  const startTask = async (assignment) => {
    setActiveTasks(prev =>
      prev.map(a => a._id === assignment._id ? { ...a, status: "in_progress" } : a)
    );
    try {
      await apiUpdateTaskStatus(assignment._id, "in_progress");
    } catch (err) {
      // Rollback
      setActiveTasks(prev =>
        prev.map(a => a._id === assignment._id ? { ...a, status: "assigned" } : a)
      );
      throw err;
    }
  };

  /** Complete a task — moves to history */
  const completeTask = async (assignment) => {
    // Optimistic: remove from active
    setActiveTasks(prev => prev.filter(a => a._id !== assignment._id));
    setHistory(prev => [{ ...assignment, status: "completed", completedAt: new Date().toISOString() }, ...prev]);

    try {
      await apiUpdateTaskStatus(assignment._id, "completed");
      // Refresh volunteer to get updated completedTasks count
      await loadVolunteer();
    } catch (err) {
      // Rollback
      setActiveTasks(prev => [assignment, ...prev]);
      setHistory(prev => prev.filter(h => h._id !== assignment._id));
      throw err;
    }
  };

  /** Update volunteer profile fields */
  const updateProfile = async (data) => {
    const res = await apiUpdateVolunteer(volunteer._id, data);
    setVolunteer(res.data);
  };

  /** Manual refresh of all data */
  const refresh = useCallback(async () => {
    const vol = volunteer || (await loadVolunteer());
    if (vol) await loadAll(vol);
  }, [volunteer, loadVolunteer, loadAll]);

  return (
    <VolunteerContext.Provider value={{
      volunteer,
      recommendations,
      activeTasks,
      history,
      loading,
      error,
      acceptTask,
      startTask,
      completeTask,
      updateProfile,
      refresh,
    }}>
      {children}
    </VolunteerContext.Provider>
  );
}

export const useVolunteer = () => {
  const ctx = useContext(VolunteerContext);
  if (!ctx) throw new Error("useVolunteer must be used inside VolunteerProvider");
  return ctx;
};
