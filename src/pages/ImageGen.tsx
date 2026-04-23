import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, Sparkles, Upload, Instagram } from "lucide-react";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";

/**
 * Gerador de imagens 100% gratuito via Pollinations.ai.
 * Modo livre: gera imagem 1024x1024 a partir de prompt.
 * Modo Instagram Post: usa imagem enviada como template (texto/logos preservados),
 * gera novo fundo via Pollinations e compõe em canvas 1080x1080.
 */
const POLL_BASE = "https://image.pollinations.ai/prompt";

const buildPollUrl = (prompt: string, w = 1024, h = 1024) => {
  const seed = Math.floor(Math.random() * 1_000_000);
  return `${POLL_BASE}/${encodeURIComponent(
    prompt
  )}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });

const ImageGen = () => {
  // Free generation
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Instagram post
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [bgPrompt, setBgPrompt] = useState("");
  const [opacity, setOpacity] = useState(85);
  const [postLoading, setPostLoading] = useState(false);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!templateFile) {
      setTemplatePreview(null);
      return;
    }
    const url = URL.createObjectURL(templateFile);
    setTemplatePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [templateFile]);

  const generate = async () => {
    const p = prompt.trim();
    if (!p) {
      toast.error("Descreva a imagem");
      return;
    }
    setLoading(true);
    setImageUrl(null);
    try {
      const url = buildPollUrl(p);
      await loadImage(url);
      setImageUrl(url);
      toast.success("Imagem gerada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const generatePost = async () => {
    if (!templatePreview) {
      toast.error("Envie a imagem do post original");
      return;
    }
    const p = bgPrompt.trim();
    if (!p) {
      toast.error("Descreva o novo fundo");
      return;
    }
    setPostLoading(true);
    setPostUrl(null);
    try {
      const SIZE = 1080;
      // 1. Carrega template original
      const tpl = await loadImage(templatePreview);
      // 2. Gera novo fundo via Pollinations
      const bgUrl = buildPollUrl(p, SIZE, SIZE);
      const bg = await loadImage(bgUrl);

      // 3. Compõe no canvas 1080x1080
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");

      // Fundo cobre todo o canvas
      ctx.drawImage(bg, 0, 0, SIZE, SIZE);

      // Template centralizado preservando proporção (cover)
      const scale = Math.max(SIZE / tpl.width, SIZE / tpl.height);
      const tw = tpl.width * scale;
      const th = tpl.height * scale;
      const tx = (SIZE - tw) / 2;
      const ty = (SIZE - th) / 2;
      ctx.globalAlpha = opacity / 100;
      ctx.drawImage(tpl, tx, ty, tw, th);
      ctx.globalAlpha = 1;

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setPostUrl(dataUrl);
      toast.success("Post gerado!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar post");
    } finally {
      setPostLoading(false);
    }
  };

  const downloadFromUrl = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Falha no download");
    }
  };

  return (
    <>
      <SEOHead
        title="Gerador de Imagens Grátis com IA"
        description="Crie imagens e posts para Instagram com IA gratuitamente."
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

          <Tabs defaultValue="free" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="free">
                <Sparkles className="mr-2 h-4 w-4" /> Imagem livre
              </TabsTrigger>
              <TabsTrigger value="post">
                <Instagram className="mr-2 h-4 w-4" /> Post Instagram
              </TabsTrigger>
            </TabsList>

            {/* ---- Modo livre ---- */}
            <TabsContent value="free" className="space-y-4">
              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Descreva a imagem</Label>
                  <Input
                    id="prompt"
                    placeholder="Ex: gato astronauta no espaço, arte digital"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && generate()
                    }
                  />
                </div>
                <Button
                  onClick={generate}
                  disabled={loading}
                  className="w-full"
                >
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
                  <Button
                    onClick={() =>
                      downloadFromUrl(imageUrl, `image-${Date.now()}.jpg`)
                    }
                    variant="secondary"
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" /> Baixar imagem
                  </Button>
                </Card>
              )}
            </TabsContent>

            {/* ---- Modo Post Instagram ---- */}
            <TabsContent value="post" className="space-y-4">
              <Card className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Envie um post existente (com textos, logos, layout). O
                  sistema gera um novo fundo com IA e mantém todas as
                  informações do post original sobrepostas no formato 1080×1080.
                </p>

                <div className="space-y-2">
                  <Label>Post original</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setTemplateFile(e.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {templateFile ? templateFile.name : "Escolher imagem"}
                  </Button>
                  {templatePreview && (
                    <img
                      src={templatePreview}
                      alt="Preview do template"
                      className="mt-2 w-32 rounded-md border"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bgPrompt">Novo fundo (descreva)</Label>
                  <Input
                    id="bgPrompt"
                    placeholder="Ex: gradiente roxo abstrato com brilhos"
                    value={bgPrompt}
                    onChange={(e) => setBgPrompt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opacity">
                    Opacidade do post original: {opacity}%
                  </Label>
                  <input
                    id="opacity"
                    type="range"
                    min={30}
                    max={100}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Reduza se quiser que o novo fundo apareça mais.
                  </p>
                </div>

                <Button
                  onClick={generatePost}
                  disabled={postLoading}
                  className="w-full"
                >
                  {postLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando post...
                    </>
                  ) : (
                    <>
                      <Instagram className="mr-2 h-4 w-4" />
                      Gerar post Instagram
                    </>
                  )}
                </Button>
              </Card>

              {postUrl && (
                <Card className="p-4 space-y-4">
                  <img
                    src={postUrl}
                    alt="Post gerado"
                    width={1080}
                    height={1080}
                    loading="lazy"
                    className="w-full rounded-md aspect-square"
                  />
                  <Button
                    onClick={() =>
                      downloadFromUrl(postUrl, `instagram-${Date.now()}.jpg`)
                    }
                    variant="secondary"
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" /> Baixar post
                  </Button>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
};

export default ImageGen;
