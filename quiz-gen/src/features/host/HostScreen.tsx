import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  CircleHelp,
  LoaderCircle,
  Play,
  RotateCcw,
  UserRoundX,
  Users,
} from "lucide-react";
import type { LobbySnapshot } from "../shared/types";
import { getSocket, type ClientSocketLike } from "../../lib/socket";
import {
  Panel,
  AccentButton,
  GhostButton,
  SectionLabel,
  Shell,
} from "../../components/ui";
import { TimerBar } from "../../components/TimerBar";
import { quizQuestionCountLimits } from "../../../shared/quiz";

type HostScreenProps = {
  socket?: ClientSocketLike;
};

export function HostScreen({ socket = getSocket() }: HostScreenProps) {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState(() => searchParams.get("topic") ?? "");
  const [questionCount, setQuestionCount] = useState(
    String(quizQuestionCountLimits.default),
  );
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const handleSnapshot = (nextSnapshot: LobbySnapshot) => {
      setError(null);
      setIsGenerating(false);
      setSnapshot(nextSnapshot);
    };
    const handleError = (payload: { message: string }) => {
      setIsGenerating(false);
      setError(payload.message);
    };

    socket.connect();
    socket.on("lobby:snapshot", handleSnapshot);
    socket.on("lobby:error", handleError);

    return () => {
      socket.off("lobby:snapshot", handleSnapshot);
      socket.off("lobby:error", handleError);
      socket.disconnect();
    };
  }, [socket]);

  const parsedQuestionCount = Number(questionCount);
  const isQuestionCountValid =
    Number.isInteger(parsedQuestionCount) &&
    parsedQuestionCount >= quizQuestionCountLimits.min &&
    parsedQuestionCount <= quizQuestionCountLimits.max;
  const canGenerate = topic.trim().length > 0 && isQuestionCountValid;
  const canStart = snapshot?.status === "ready";
  const isFinished = snapshot?.status === "finished";
  const currentQuestion = snapshot?.currentQuestion;
  const isFormLocked = isGenerating;
  const connectedPlayers =
    snapshot?.players.filter((player) => player.isConnected).length ?? 0;
  const hasNextQuestion =
    typeof snapshot?.currentQuestionIndex === "number" &&
    snapshot.currentQuestionIndex < snapshot.totalQuestions - 1;

  return (
    <Shell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">The host’s seat</p>
          <h1>Make a night of it.</h1>
          <p>A topic, a few friends, and a little friendly competition.</p>
        </div>
        <span className="context-tag">
          <MonitorIcon /> Host console
        </span>
      </div>
      <div
        className={`host-layout ${snapshot ? "has-room" : ""} ${currentQuestion || snapshot?.status === "leaderboard" ? "is-playing" : ""}`}
      >
        <div className="main-column">
          <Panel className="setup-panel">
            <div className="panel-heading">
              <div>
                <SectionLabel>01 / The setup</SectionLabel>
                <h2>What’s the topic?</h2>
              </div>
              <CircleHelp className="muted-icon" size={22} />
            </div>
            <p className="panel-description">
              Go broad or wonderfully specific. We’ll write the questions.
            </p>
            <div className="setup-fields">
              <label className="field">
                <span>Topic</span>
                <textarea
                  aria-label="Topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  disabled={isFormLocked}
                  placeholder="e.g. Space, 2000s music, or very obscure movie trivia…"
                  rows={4}
                />
              </label>
              <div className="question-count-row">
                <label className="field">
                  <span>Questions</span>
                  <input
                    aria-label="Questions"
                    value={questionCount}
                    type="number"
                    min={quizQuestionCountLimits.min}
                    max={quizQuestionCountLimits.max}
                    inputMode="numeric"
                    onChange={(event) =>
                      setQuestionCount(event.target.value.replace(/[^\d]/g, ""))
                    }
                    disabled={isFormLocked}
                  />
                </label>
                <p>
                  Keep it quick or settle in.
                  <br />
                  Choose {quizQuestionCountLimits.min}–
                  {quizQuestionCountLimits.max} questions.
                </p>
              </div>
            </div>
            <div className="setup-actions">
              <AccentButton
                onClick={() => {
                  setIsGenerating(true);
                  socket.emit("host:createLobby", {
                    topic: topic.trim(),
                    questionCount: parsedQuestionCount,
                  });
                }}
                disabled={!canGenerate || isFormLocked}
              >
                {isGenerating ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" />
                    Generating quiz...
                  </>
                ) : (
                  <>
                    Generate quiz
                    <ArrowUpRight size={18} />
                  </>
                )}
              </AccentButton>
              <span>
                {isGenerating
                  ? "Good questions take a moment."
                  : "Made fresh for your room."}
              </span>
            </div>
            {error ? (
              <div className="error-message" role="alert">
                {error}
              </div>
            ) : null}
          </Panel>

          {snapshot ? (
            <Panel className="game-panel">
              <div className="panel-heading">
                <div>
                  <SectionLabel>02 / The game</SectionLabel>
                  <h2>{snapshot.quizTitle ?? "Getting things ready…"}</h2>
                </div>
                <span className="status-badge">
                  <span className="status-dot" />
                  {snapshot.status.replace(/_/g, " ")}
                </span>
              </div>
              {currentQuestion ? (
                <div className="question-content">
                  <SectionLabel>
                    Question {snapshot.currentQuestionIndex + 1} of{" "}
                    {snapshot.totalQuestions}
                  </SectionLabel>
                  <h3 className="question-title">{currentQuestion.prompt}</h3>
                  <TimerBar
                    startedAt={currentQuestion.startedAt}
                    endsAt={currentQuestion.endsAt}
                    isActive={snapshot.status === "question_live"}
                  />
                  <div className="answer-grid">
                    {currentQuestion.options.map((option, index) => (
                      <div
                        key={option}
                        className={`answer-tile ${currentQuestion.correctIndex === index ? "answer-correct" : ""}`}
                      >
                        <span className="answer-letter">{"ABCD"[index]}</span>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                  {currentQuestion.explanation ? (
                    <p className="explanation">{currentQuestion.explanation}</p>
                  ) : null}
                </div>
              ) : snapshot.status === "leaderboard" ? (
                <div className="phase-message">
                  <SectionLabel>
                    {hasNextQuestion
                      ? "Round leaderboard"
                      : "Final leaderboard"}
                  </SectionLabel>
                  <h3>
                    {hasNextQuestion
                      ? "Scores are in. Next round is loading."
                      : "Final scores are locked in."}
                  </h3>
                  {hasNextQuestion ? (
                    <TimerBar
                      startedAt={snapshot.phaseStartedAt}
                      endsAt={snapshot.phaseEndsAt}
                      isActive
                      label="Next round in"
                    />
                  ) : null}
                  <p>
                    {hasNextQuestion
                      ? "A quick breather. The next question starts automatically."
                      : "One last look at the standings before the room resets."}
                  </p>
                </div>
              ) : isFinished ? (
                <div className="phase-message">
                  <SectionLabel>Waiting room</SectionLabel>
                  <h3>That’s a wrap.</h3>
                  <p>Same quiz, another go? Restart when everyone’s ready.</p>
                </div>
              ) : (
                <p className="panel-description">
                  Share the room code, get everyone in, and start when you’re
                  ready.
                </p>
              )}
              <div className="game-actions">
                <AccentButton
                  onClick={() =>
                    socket.emit("game:start", { code: snapshot.code })
                  }
                  disabled={!canStart || isFormLocked}
                >
                  <Play size={16} />
                  Start game
                </AccentButton>
                <GhostButton
                  onClick={() =>
                    socket.emit("game:restart", { code: snapshot.code })
                  }
                  disabled={!isFinished || isFormLocked}
                >
                  <RotateCcw size={16} />
                  Restart
                </GhostButton>
              </div>
            </Panel>
          ) : (
            <div className="host-tip">
              <span>↳</span>
              <p>
                <strong>Make it a shared screen.</strong> Open this page on a
                laptop or TV. Everyone else can join on their phones.
              </p>
            </div>
          )}
        </div>
        <aside className="side-column">
          <div className="room-panel">
            <SectionLabel>Your room code</SectionLabel>
            <p className={`room-code ${!snapshot ? "room-code-empty" : ""}`}>
              {snapshot?.code ?? "— — — —"}
            </p>
            <p>
              {snapshot
                ? "Share this code. Let the good guesses begin."
                : "Generate a quiz to open your room."}
            </p>
            <div className="room-panel-bottom">
              <span className="status-dot" />
              {snapshot ? "Room open" : "Your table is almost ready"}
            </div>
          </div>
          <Panel className="roster-panel">
            <div className="panel-heading">
              <div>
                <SectionLabel>The people</SectionLabel>
                <h2>Lobby roster</h2>
              </div>
              <span className="count-badge">{connectedPlayers}</span>
            </div>
            <p className="roster-count">{connectedPlayers} players connected</p>
            {snapshot?.players.length ? (
              <div className="roster-list">
                {snapshot.players.map((player) => (
                  <div key={player.id} className="player-row">
                    <span className="player-avatar">
                      {player.nickname.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="player-detail">
                      <strong>{player.nickname}</strong>
                      <span>
                        {player.isConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    <strong className="player-score">
                      {player.score.toLocaleString()}
                    </strong>
                    <button
                      type="button"
                      aria-label={`Kick ${player.nickname}`}
                      onClick={() =>
                        socket.emit("host:kickPlayer", {
                          code: snapshot.code,
                          playerId: player.id,
                        })
                      }
                      className="kick-button"
                    >
                      <UserRoundX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <Users size={25} />
                </span>
                <h3>Good company incoming.</h3>
                <p>
                  Players will appear here
                  <br />
                  when they join your room.
                </p>
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </Shell>
  );
}

function MonitorIcon() {
  return <span aria-hidden="true" className="console-dot" />;
}
