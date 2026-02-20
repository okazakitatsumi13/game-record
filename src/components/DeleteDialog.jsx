"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * @param {{
 *  open: boolean,
 *  onOpenChange: (open:boolean)=>void,
 *  title: string,
 *  onConfirm: ()=> (void | Promise<void>)
 * }} props
 */
export function DeleteDialog({ open, onOpenChange, title, onConfirm }) {
  const handleConfirm = async (e) => {
    // form 送信などの事故を防ぐ
    e?.preventDefault?.();

    try {
      await onConfirm?.();
    } finally {
      // 成功/失敗に関わらず、ダイアログは閉じる
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{title}」を削除します。この操作は元に戻せません。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>

          <AlertDialogAction
            type="button"
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
