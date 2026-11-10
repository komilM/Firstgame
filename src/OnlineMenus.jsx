import { useEffect, useState } from "react";
import { MAX_TEAM, ONLINE_TEXT, defaultServerUrl, loadName, saveName } from "./online.js";

export default function OnlineMenus({ online, language, text, menuPage, setMenuPage, onResume }) {
  const ot = ONLINE_TEXT[language];
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState("");

  // Xonaga kirganda — xona sahifasi, chiqib ketganda — ulanish sahifasi
  useEffect(() => {
    if (online.inRoom && menuPage === "online") setMenuPage("lobby");
    if (!online.inRoom && menuPage === "lobby") setMenuPage("online");
  }, [online.inRoom, menuPage, setMenuPage]);

  const busy = online.status === "connecting";

  const go = (mode) => {
    const cleanName = name.trim();
    saveName(cleanName);
    online.connect(defaultServerUrl(), cleanName, mode, code.trim().toUpperCase());
  };

  if (menuPage === "online") {
    return (
      <div className="menu-card online-menu-card">
        <div className="settings-ribbon">{ot.title}</div>
        <div className="online-form">
          <label className="setting-row">
            <span>{ot.name}</span>
            <input className="online-input" value={name} maxLength={14} onChange={(event) => setName(event.target.value)} />
          </label>
          <button className="menu-start" type="button" disabled={busy} onClick={() => go("create")}>
            {busy ? ot.connecting : ot.create}
          </button>
          <div className="online-join">
            <input
              className="online-input online-code"
              placeholder={ot.code}
              value={code}
              maxLength={4}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <button className="menu-nav-button" type="button" disabled={busy || code.length < 4} onClick={() => go("join")}>
              {ot.join}
            </button>
          </div>
          {online.error && <p className="online-error">{ot.err[online.error] || online.error}</p>}
        </div>
        <button className="menu-back-button" type="button" onClick={() => setMenuPage("main")}>
          {text.back}
        </button>
      </div>
    );
  }

  if (menuPage === "lobby" && online.room) {
    const room = online.room;
    const isHost = room.hostId === room.id;
    const playing = room.phase === "play";
    const members = (team) => room.players.filter((p) => p.team === team);
    const counts = { blue: members("blue").length, red: members("red").length };
    const canStart = counts.blue > 0 && counts.red > 0;

    return (
      <div className="menu-card lobby-card">
        <div className="settings-ribbon">
          {ot.room} {room.code}
        </div>
        <div className="lobby-teams">
          {["blue", "red"].map((team) => (
            <div key={team} className={`lobby-team ${team}`}>
              <div className="lobby-team-title">
                ◆ {ot[team]} · {counts[team]}/{MAX_TEAM}
              </div>
              {Array.from({ length: MAX_TEAM }, (_, i) => members(team)[i] || null).map((p, i) => (
                <div key={i} className={`lobby-slot${p ? "" : " empty"}`}>
                  {p ? (
                    <>
                      {p.name}
                      {p.id === room.hostId && <em>{ot.host}</em>}
                      {p.id === room.id && <em>{ot.you}</em>}
                    </>
                  ) : (
                    ot.empty
                  )}
                </div>
              ))}
              {online.team !== team && counts[team] < MAX_TEAM && !playing && (
                <button className="lobby-switch" type="button" onClick={() => online.setTeam(team)}>
                  {ot.joinTeam}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="section-label">{ot.map}</div>
        <div className="lobby-maps">
          {["meadow", "desert", "snow"].map((id) => (
            <button
              key={id}
              type="button"
              className={`lobby-map${room.map === id ? " selected" : ""}`}
              disabled={!isHost || playing}
              onClick={() => online.setMap(id)}
            >
              {text[id]}
            </button>
          ))}
        </div>

        {isHost && !playing && !canStart && <p className="online-hint">{ot.needBoth}</p>}
        {!isHost && !playing && <p className="online-hint">{ot.waitHost}</p>}

        <div className="settings-actions">
          <button className="menu-back-button" type="button" onClick={() => online.leave()}>
            {ot.leave}
          </button>
          {playing ? (
            <button className="menu-start" type="button" onClick={onResume}>
              {ot.resume}
            </button>
          ) : (
            isHost && (
              <button className="menu-start" type="button" disabled={!canStart} onClick={() => online.start()}>
                {ot.start}
              </button>
            )
          )}
        </div>
        <button className="menu-back-button lobby-back" type="button" onClick={() => setMenuPage("main")}>
          {text.back}
        </button>
      </div>
    );
  }

  return null;
}