import React, { useState } from 'react';
import { MapPin, Clock, Trophy, ChevronRight, Search, Flag, Globe, Compass } from 'lucide-react';

const COUNTRY_FLAGS = {
  AU: '🇦🇺 Australia',
  GB: '🇬🇧 Great Britain',
  UK: '🇬🇧 Great Britain',
  NZ: '🇳🇿 New Zealand',
  US: '🇺🇸 United States',
  USA: '🇺🇸 United States',
  HK: '🇭🇰 Hong Kong',
  FR: '🇫🇷 France',
  ZA: '🇿🇦 South Africa',
  IE: '🇮🇪 Ireland',
  JP: '🇯🇵 Japan',
  SG: '🇸🇬 Singapore',
  DE: '🇩🇪 Germany',
  AE: '🇦🇪 UAE',
  CA: '🇨🇦 Canada',
};

const COUNTRY_SHORT = {
  AU: '🇦🇺 AU',
  GB: '🇬🇧 GB',
  UK: '🇬🇧 UK',
  NZ: '🇳🇿 NZ',
  US: '🇺🇸 US',
  HK: '🇭🇰 HK',
  FR: '🇫🇷 FR',
  ZA: '🇿🇦 ZA',
  IE: '🇮🇪 IE',
  JP: '🇯🇵 JP',
  SG: '🇸🇬 SG',
  DE: '🇩🇪 DE',
  AE: '🇦🇪 AE',
  CA: '🇨🇦 CA',
};

export default function MeetingSelector({
  meetings,
  selectedMeeting,
  selectedRaceNumber,
  onSelectRace,
  isLoading
}) {
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('ALL');

  if (isLoading) {
    return (
      <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-6 text-center animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3 mx-auto mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 bg-slate-800/50 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!meetings || meetings.length === 0) {
    return (
      <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <Trophy className="w-12 h-12 mx-auto mb-2 text-slate-600 opacity-50" />
        <p className="font-semibold text-slate-300">No race meetings found for this date.</p>
        <p className="text-xs text-slate-500 mt-1">Try selecting another date or switching race category (Gallops, Harness, Dogs) above.</p>
      </div>
    );
  }

  // Get unique countries dynamically
  const uniqueCountries = Array.from(new Set(
    meetings.map(m => (m.country ? m.country.toUpperCase() : 'AU'))
  )).sort();
  const countries = ['ALL', ...uniqueCountries];

  // Filter meetings
  const filteredMeetings = meetings.filter(m => {
    const countryCode = (m.country || 'AU').toUpperCase();
    const trackName = (m.track || '').toLowerCase();
    const stateName = (m.state || m.place || m.location || '').toLowerCase();
    const matchesSearch = trackName.includes(searchFilter.toLowerCase()) || stateName.includes(searchFilter.toLowerCase());
    const matchesCountry = selectedCountry === 'ALL' || countryCode === selectedCountry;
    return matchesSearch && matchesCountry && !m.abandoned;
  });

  return (
    <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            Race Meetings & Cards
          </h2>
          <p className="text-xs text-slate-400">
            {filteredMeetings.length} of {meetings.length} venues active &bull; Click a race to run C++ Monte Carlo prediction
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Country filter tabs */}
          <div className="flex flex-wrap bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs gap-1 max-w-full overflow-x-auto">
            {countries.map(c => {
              const label = c === 'ALL' ? '🌍 All Countries' : (COUNTRY_SHORT[c] || c);
              return (
                <button
                  key={c}
                  onClick={() => setSelectedCountry(c)}
                  className={`px-2.5 py-1 rounded font-semibold transition-all whitespace-nowrap ${
                    selectedCountry === c
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search track / state..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-slate-900 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 border border-slate-700 focus:outline-none focus:border-amber-500 w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Horizontal Venue Cards & Races */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No venues match the selected country filter "{selectedCountry}" or search query.
          </div>
        ) : (
          filteredMeetings.map((meeting) => {
            const isSelectedVenue = selectedMeeting?.slug === meeting.slug || selectedMeeting?.track === meeting.track;
            const countryCode = (meeting.country || 'AU').toUpperCase();
            const countryDisplay = COUNTRY_FLAGS[countryCode] || countryCode;
            const placeInfo = meeting.state || meeting.place || meeting.location || null;
            const timezoneInfo = meeting.timezone || null;

            return (
              <div
                key={meeting.slug || meeting.track}
                className={`rounded-xl p-3.5 border transition-all ${
                  isSelectedVenue
                    ? 'bg-slate-900/95 border-amber-500/60 shadow-lg ring-1 ring-amber-500/30'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Track Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800/90 text-amber-300 font-mono text-[11px] font-bold border border-slate-700/80 shadow-sm flex items-center gap-1">
                      {countryDisplay}
                    </span>

                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                      {meeting.track}
                      {placeInfo && (
                        <span className="text-xs font-normal text-slate-400 font-sans">
                          ({placeInfo})
                        </span>
                      )}
                    </h3>

                    <span className="text-xs text-slate-500 font-mono">
                      &bull; {meeting.races?.length || 0} races
                    </span>
                  </div>

                  {/* Timezone badge */}
                  {timezoneInfo && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{timezoneInfo}</span>
                    </div>
                  )}
                </div>

                {/* Race buttons pills */}
                <div className="flex flex-wrap gap-1.5">
                  {meeting.races?.map((race) => {
                    const isSelectedRace = isSelectedVenue && selectedRaceNumber === race.raceNumber;

                    // Format race start time if available
                    let timeStr = null;
                    if (race.startTime) {
                      try {
                        const d = new Date(race.startTime);
                        timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                      } catch (e) {}
                    }

                    return (
                      <button
                        key={race.raceNumber}
                        onClick={() => onSelectRace(meeting, race.raceNumber)}
                        className={`group px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all border ${
                          isSelectedRace
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold border-amber-400 shadow-md scale-[1.02]'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700/70 hover:bg-slate-700/80 hover:border-slate-600'
                        }`}
                      >
                        <span className="font-bold">R{race.raceNumber}</span>
                        {race.distance && (
                          <span className={`text-[11px] ${isSelectedRace ? 'text-slate-950 font-semibold' : 'text-slate-400'}`}>
                            {race.distance}
                          </span>
                        )}
                        {timeStr && (
                          <span className={`text-[10px] px-1 py-0.2 rounded ${isSelectedRace ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                            {timeStr}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
