// src/components/StateResultsMap.js
import React, { useState, useEffect } from "react";
import { Box, Typography, CircularProgress, Alert, Button } from "@mui/material";
import { geoAlbersUsa } from "d3-geo";
import {
  ComposableMap,
  ZoomableGroup,
  Geographies,
  Geography,
} from "react-simple-maps";

// We assume your front-end calls run at the same server, or
// we read from REACT_APP_API_URL. If you've set that, use it:
const BACKEND_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:3030";

const StateResultsMap = ({ pollId = "election" }) => {
  const [mapData, setMapData] = useState(null);
  const [byState, setByState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to load both the map and the state-level results
  const loadAll = async () => {
    setLoading(true);
    setError(null);

    // Step 1: fetch the states-10m.json from the backend
    try {
      const resp = await fetch(`${BACKEND_URL}/map/us_states`);
      if (!resp.ok) throw new Error(`Failed to fetch map data: ${resp.status}`);
      const topoJson = await resp.json();
      setMapData(topoJson);
    } catch (err) {
      setError(`Error loading map data: ${err.message}`);
      setLoading(false);
      return;
    }

    // Step 2: fetch the state-level results from /poll/:pollId/vote_counts_by_state
    try {
      const resp = await fetch(`${BACKEND_URL}/poll/${pollId}/vote_counts_by_state`);
      if (!resp.ok) {
        throw new Error(`Failed to fetch vote counts: ${resp.status}`);
      }
      const data = await resp.json();
      if (data.by_state) {
        setByState(data.by_state);
      } else {
        setByState({});
      }
    } catch (err) {
      setError(`Error loading vote counts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [pollId]);

  const getLeadingCandidate = (stateCode) => {
    if (!byState || !byState[stateCode]) return null;
    const entries = Object.entries(byState[stateCode]);
    if (entries.length === 0) return null;
    // sort descending
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0]; // leading candidate name
  };

  const colorForCandidate = (candidate) => {
    switch (candidate) {
      case "Candidate A": return "#FF0000"; // red
      case "Candidate B": return "#0000FF"; // blue
      case "Candidate C": return "#008000"; // green
      default: return "#DDDDDD"; // gray
    }
  };

  // The standard US projection
  const projection = geoAlbersUsa().scale(1000).translate([487.5, 305]);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" align="center" gutterBottom>
        State-Level Results
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && (
        <Box textAlign="center" my={2}>
          <CircularProgress />
        </Box>
      )}
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <Button variant="contained" disabled={loading} onClick={loadAll}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </Box>
      {mapData && (
        <Box sx={{ width: "100%", maxWidth: 900, margin: "auto" }}>
          <ComposableMap projection={projection}>
            <ZoomableGroup>
              <Geographies geography={mapData}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const stateAbbr = geo.properties.STUSPS; // e.g. "CA"
                    const leadingCandidate = getLeadingCandidate(stateAbbr);
                    const fillColor = leadingCandidate
                      ? colorForCandidate(leadingCandidate)
                      : "#EEEEEE";
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillColor}
                        stroke="#FFFFFF"
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </Box>
      )}
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="h6">Legend</Typography>
        <Typography>Candidate A = Red</Typography>
        <Typography>Candidate B = Blue</Typography>
        <Typography>Candidate C = Green</Typography>
      </Box>
    </Box>
  );
};

export default StateResultsMap;
