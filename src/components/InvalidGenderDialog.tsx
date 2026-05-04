import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import warningImg from "@/assets/gender-warning.jpg";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InvalidGenderDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display fpc-text-gold text-center text-xl">
            ESCOLHA UMA OPÇÃO VÁLIDA
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          <img
            src={warningImg}
            alt="Aviso"
            className="rounded-xl max-h-80 object-contain"
            loading="lazy"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-gold text-primary-foreground"
          >
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
