import React, { useState } from 'react';
import { MapPin, Clock, Trophy, ChevronRight, Search, Flag } from 'lucide-react';

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
        <p className="font-semibold">No meetings found for this date.</p>
        <p className="text-xs text-slate-500 mt-1">Try selecting another date or race category above.</p>
      </div>
    );
  }

  // Get unique countries
  const countries = ['ALL', ...new Set(meetings.map(m => (m.country || 'AU').toUpperCase()))];

  // Filter meetings
  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.track.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCountry = selectedCountry === 'ALL' || (m.country || 'AU').toUpperCase() === selectedCountry;
    return matchesSearch && matchesCountry && !m.abandoned;
  });

  return (
    <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            Race Meetings & Cards
          </h2>
          <p className="text-xs text-slate-400">
            {filteredMeetings.length} venues active &bull; Click a race to run C++ prediction
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Country filter */}
          <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
            {countries.slice(0, 4).map(c => (
              <button
                key={c}
                onClick={() => setSelectedCountry(c)}
                className={`px-2 py-1 rounded font-semibold transition-all ${
                  selectedCountry === c ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search track..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-slate-900 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 border border-slate-700 focus:outline-none focus:border-amber-500 w-32 sm:w-40"
            />
          </div>
        </div>
      </div>

      {/* Horizontal Venue Cards & Races */}
      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {filteredMeetings.map((meeting) => {
          const isSelectedVenue = selectedMeeting?.slug === meeting.slug || selectedMeeting?.track === meeting.track;

          return (
            <div
              key={meeting.slug || meeting.track}
              className={`rounded-xl p-3 border transition-all ${
                isSelectedVenue
                  ? 'bg-slate-900/90 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase border border-slate-700">
                    {meeting.country || 'AU'}
                  </span>
                  <h3 className="font-bold text-sm text-slate-100">{meeting.track}</h3>
                  <span className="text-xs text-slate-500 font-mono">({meeting.races?.length || 0} races)</span>
                </div>
              </div>

              {/* Race buttons pills */}
              <div className="flex flex-wrap gap-1.5">
                {meeting.races?.map((race) => {
                  const isSelectedRace = isSelectedVenue && selectedRaceNumber === race.raceNumber;

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
                        <span className={`text-[11px] ${isSelectedRace ? 'text-slate-900' : 'text-slate-400'}`}>
                          {race.distance}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
