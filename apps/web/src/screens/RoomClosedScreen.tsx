import { Button, OwlMascot, SurfaceCard } from '../design';
import { useGameStore } from '../state/useGameStore';

export function RoomClosedScreen() {
  const closedReason = useGameStore((s) => s.closedReason);
  const setRoute = useGameStore((s) => s.setRoute);

  return (
    <main
      data-testid="room-closed-screen"
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center px-4 py-8"
    >
      <SurfaceCard className="w-full space-y-5 text-center">
        <OwlMascot
          pose="idle"
          size="md"
          line={closedReason || 'The candles have gone out at this table.'}
        />
        <h1 className="font-display text-2xl font-bold">Table Closed</h1>
        <Button variant="primary-dare" fullWidth onClick={() => setRoute('HOME')}>
          Back to Home
        </Button>
      </SurfaceCard>
    </main>
  );
}
