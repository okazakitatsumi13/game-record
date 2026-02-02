import { Card } from "@/components/ui/card";
import { GameCard } from "@/components/GameCard";

export function GameList({ games, onEdit, onDelete }) {
  if (!games.length) {
    return (
      <section className="grid gap-3">
        <Card className="p-6">
          <div className="text-base font-medium">まだゲームがありません</div>
          <p className="mt-1 text-sm text-muted-foreground">
            右上の「ゲームを追加」から登録できます。
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      {games.map((g) => (
        <GameCard key={g.id} game={g} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </section>
  );
}
