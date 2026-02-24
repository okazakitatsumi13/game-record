import { Card } from "@/components/ui/card";
import { GameCard } from "@/components/GameCard";

export function GameList({ games, onEdit, onDelete }) {
  if (games.length === 0) {
    return (
      <section className="grid grid-cols-1 gap-3 min-w-0">
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
    <section className="grid grid-cols-1 gap-3 min-w-0">
      {games.map((gameItem) => (
        <GameCard
          key={gameItem.id}
          game={gameItem}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
}
