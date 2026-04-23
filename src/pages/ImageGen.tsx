import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";

/**
 * Gerador de imagens 100% gratuito via Pollinations.ai.
 * Não consome créditos do Lovable AI / OpenAI / Google.
 * Endpoint público, sem chave de API.
 */
const ImageGen = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const p = prompt.trim();
    if (!p) {
      toast.error("Descreva a imagem que você quer gerar");
      return;
    }
    setLoading(true);
    setImageUrl(null);
    try {
      const seed = Math.floor(Math.random() * 1_000_000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        p
      )}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;
      // Pré-carrega para detectar erros antes de exibir
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao gerar imagem"));
        img.src = url;
      });
      setImageUrl(url);
      toast.success("Imagem gerada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `image-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Não foi possível baixar a imagem");
    }
  };

  return (
    <>
      <SEOHead
        title="Gerador de Imagens Grátis com IA"
        description="Crie imagens com IA gratuitamente, sem cadastro e sem custos."
      />
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="space-y-2 text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              Gerador de Imagens
            </h1>
            <p className="text-muted-foreground">
              100% gratuito · sem créditos · sem cadastro
            </p>
          </header>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Descreva a imagem</Label>
              <Input
                id="prompt"
                placeholder="Ex: um gato astronauta flutuando no espaço, arte digital"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
              />
            </div>
            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar imagem
                </>
              )}
            </Button>
          </Card>

          {imageUrl && (
            <Card className="p-4 space-y-4">
              <img
                src={imageUrl}
                alt={prompt}
                width={1024}
                height={1024}
                loading="lazy"
                className="w-full rounded-md"
              />
              <Button onClick={download} variant="secondary" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Baixar imagem
              </Button>
            </Card>
          )}
        </div>
      </main>
    </>
  );
};

export default ImageGen;
