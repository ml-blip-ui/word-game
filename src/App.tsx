import { useState } from 'react';
import { useGame } from './lib/useGame';
import { TitleScreen } from './screens/TitleScreen';
import { GroupScreen } from './screens/GroupScreen';
import { ModeScreen } from './screens/ModeScreen';
import { TeamsScreen } from './screens/TeamsScreen';
import { RoundLengthScreen } from './screens/RoundLengthScreen';
import { WinConditionScreen } from './screens/WinConditionScreen';
import { HandoverScreen } from './screens/HandoverScreen';
import { WheelScreen } from './screens/WheelScreen';
import { TokenPromptScreen } from './screens/TokenPromptScreen';
import { PlayScreen } from './screens/PlayScreen';
import { SongScreen } from './screens/SongScreen';
import { AllPlayScreen } from './screens/AllPlayScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { ScoreboardScreen } from './screens/ScoreboardScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { TokenAnnouncementOverlay, AllplayAnnouncementOverlay } from './screens/Overlays';
import { categoryMeta } from './lib/categories';

export default function App() {
  const g = useGame();
  const s = g.state;
  const [preGameLeaderboard, setPreGameLeaderboard] = useState(false);

  const currentTeam = s.teams[s.currentTeamIdx];
  const turnScore = s.turnWords.reduce((a, w) => {
    const mult = w.doubled ? 2 : 1;
    if (w.flagged) return a - mult;
    return a + (w.outcome === 'correct' ? 1 : -1) * mult;
  }, 0);
  const settingsSummary = `${s.mode === 'practice' ? '1 team' : `${s.teams.length || s.teamCount} teams`} · ${s.turnSeconds}s turns · ${
    s.winType === 'time' ? `${s.winValue} minutes` : s.winType === 'points' ? `first to ${s.winValue}` : `${s.winValue} rounds`
  }`;

  let content = null;

  if (s.screen === 'mode' && preGameLeaderboard) {
    content = <LeaderboardScreen onBack={() => setPreGameLeaderboard(false)} />;
  } else {
    switch (s.screen) {
      case 'title':
        content = <TitleScreen onContinue={g.goToChooseGroup} />;
        break;
      case 'chooseGroup':
        content = <GroupScreen onPick={g.pickGroup} onSkip={g.skipGroup} />;
        break;
      case 'mode':
        content = <ModeScreen onSelect={g.setMode} onLeaderboard={() => setPreGameLeaderboard(true)} onBack={() => g.backTo('chooseGroup')} muted={s.muted} onToggleMuted={g.toggleMuted} />;
        break;
      case 'setupTeams':
        content = (
          <TeamsScreen
            mode={s.mode}
            teamCount={s.teamCount}
            draft={s.draft}
            onBack={() => g.backTo('mode')}
            onSetTeamCount={g.setTeamCount}
            onAddPlayer={g.addPlayer}
            onRemovePlayer={g.removePlayer}
            onRenamePlayer={g.renamePlayer}
            onMovePlayer={g.movePlayer}
            onContinue={() => g.backTo('setupLength')}
          />
        );
        break;
      case 'setupLength':
        content = <RoundLengthScreen turnSeconds={s.turnSeconds} onBack={() => g.backTo('setupTeams')} onSet={g.setTurnSeconds} onContinue={() => g.backTo('setupWin')} />;
        break;
      case 'setupWin':
        content = (
          <WinConditionScreen
            mode={s.mode}
            teamCount={s.teamCount}
            turnSeconds={s.turnSeconds}
            winType={s.winType}
            winValue={s.winValue}
            loading={s.loadingWord}
            onBack={() => g.backTo('setupLength')}
            onSetWinType={g.setWinType}
            onSetWinValue={g.setWinValue}
            onStart={g.startGame}
          />
        );
        break;
      case 'handover':
        content = currentTeam && <HandoverScreen team={currentTeam} onReady={g.goToWheel} />;
        break;
      case 'wheel':
        content = <WheelScreen rotationDeg={s.wheelRotationDeg} spinning={s.wheelSpinning} onSpin={g.spinWheel} />;
        break;
      case 'token':
        content = s.categoryKey && currentTeam && <TokenPromptScreen categoryKey={s.categoryKey} team={currentTeam} onSpend={g.spendToken} onDecline={g.declineToken} />;
        break;
      case 'play':
        content = s.categoryKey && (
          <PlayScreen
            categoryKey={s.categoryKey}
            word={s.currentWord}
            turnTimeLeft={s.turnTimeLeft}
            turnSeconds={s.turnSeconds}
            wordTimeLeft={s.wordTimeLeft}
            wordTimeLimit={s.wordTimeLimit}
            turnScore={turnScore}
            doubled={s.tokenSpentThisTurn}
            onGotIt={g.handleGotIt}
            onSkip={g.handleSkip}
          />
        );
        break;
      case 'song':
        content = s.categoryKey && <SongScreen categoryKey={s.categoryKey} word={s.currentWord} turnTimeLeft={s.turnTimeLeft} onGotIt={g.handleGotIt} onSkip={g.handleSkip} />;
        break;
      case 'allplay':
        content = s.categoryKey && (
          <AllPlayScreen
            categoryKey={s.categoryKey}
            word={s.currentWord}
            turnTimeLeft={s.turnTimeLeft}
            turnSeconds={s.turnSeconds}
            wordTimeLeft={s.wordTimeLeft}
            wordTimeLimit={s.wordTimeLimit}
            teams={s.teams}
            onCorrect={g.handleAllplayCorrect}
            onSkip={g.handleSkip}
          />
        );
        break;
      case 'summary':
        content = currentTeam && <SummaryScreen team={currentTeam} turnWords={s.turnWords} onToggleFlag={g.toggleFlag} onConfirm={g.confirmSummary} />;
        break;
      case 'scoreboard':
        content = s.mode && (
          <ScoreboardScreen
            mode={s.mode}
            teams={s.teams}
            collaborativeScore={s.collaborativeScore}
            bestScore={s.bestScore}
            gameOver={g.gameOver}
            settingsSummary={settingsSummary}
            onNext={g.nextTurn}
          />
        );
        break;
    }
  }

  return (
    <div className="app-shell">
      <div className="card">
        <div className="paper-grain" />
        {content}
        {s.showTokenAnnouncement && currentTeam && <TokenAnnouncementOverlay teamName={currentTeam.name} teamColor={currentTeam.color} />}
        {s.showAllplayAnnouncement && s.categoryKey && <AllplayAnnouncementOverlay categoryColor={categoryMeta(s.categoryKey).color} />}
      </div>
    </div>
  );
}
