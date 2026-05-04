import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AvatarPicker } from "@/components/AvatarPicker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { InvalidGenderDialog } from "@/components/InvalidGenderDialog";

export default function CompleteProfile() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [genderWarn, setGenderWarn] = useState(false);

  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"masculino" | "feminino">("masculino");
  const [avatar, setAvatar] = useState<string>("a1");

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
    if (profile) {
      setNickname(profile.nickname ?? "");
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      if (profile.gender === "masculino" || profile.gender === "feminino") {
        setGender(profile.gender);
      }
      if (profile.avatar_url) setAvatar(profile.avatar_url);
      if (profile.profile_completed) navigate("/", { replace: true });
    }
  }, [user, profile, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!nickname.trim() || !fullName.trim()) {
      toast.error("Apelido e nome são obrigatórios.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nickname: nickname.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        gender,
        avatar_url: avatar,
        profile_completed: true,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Perfil completo!");
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-bg">
      <Card className="fpc-card w-full max-w-lg">
        <CardContent className="p-8">
          <div className="flex justify-center mb-4"><Logo size={56} /></div>
          <h1 className="font-display text-2xl text-center fpc-text-gold">Complete seu perfil</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Vamos te apresentar à mesa.</p>

          <form onSubmit={submit} className="space-y-4 mt-6">
            <div>
              <Label className="mb-2 block">Avatar</Label>
              <AvatarPicker value={avatar} onChange={setAvatar} userId={user?.id} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Apelido *</Label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} required maxLength={30} placeholder="ReiDosBlinds" />
              </div>
              <div>
                <Label>Nome completo *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={80} />
              </div>
            </div>

            <div>
              <Label>Telefone (opcional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>

            <div>
              <Label className="mb-2 block">Gênero</Label>
              <RadioGroup value={gender} onValueChange={(v) => { if (v === "outro") { setGenderWarn(true); return; } setGender(v as any); }} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="masculino" id="g-m" /><Label htmlFor="g-m" className="cursor-pointer">Masculino</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="feminino" id="g-f" /><Label htmlFor="g-f" className="cursor-pointer">Feminino</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="outro" id="g-o" /><Label htmlFor="g-o" className="cursor-pointer">Outro</Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" disabled={busy} className="w-full bg-gradient-gold text-primary-foreground">
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Salvar e entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <InvalidGenderDialog open={genderWarn} onOpenChange={setGenderWarn} />
    </div>
  );
}
