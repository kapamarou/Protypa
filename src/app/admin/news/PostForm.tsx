"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";

const TAGS = ["Νέα Θέματα", "Ανακοινώσεις", "Στατιστικά"] as const;

interface Props {
  initial?: Partial<Post>;
  postId?: string;
}

export default function PostForm({ initial, postId }: Props) {
  const router = useRouter();
  const isEdit = Boolean(postId);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tag, setTag] = useState(initial?.tag ?? TAGS[0]);
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.cover_image_url ?? "");
  const [publishDate, setPublishDate] = useState(initial?.publish_at ? initial.publish_at.slice(0, 10) : "");
  const [publishTime, setPublishTime] = useState(initial?.publish_at ? initial.publish_at.slice(11, 16) : "09:00");
  const publishAt = publishDate ? `${publishDate}T${publishTime || "09:00"}` : "";
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function uploadCover(file: File) {
    setUploading(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("news-images").upload(path, file, { upsert: false });
    if (upErr) { setError(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("news-images").getPublicUrl(path);
    setCoverImageUrl(pub.publicUrl);
    setUploading(false);
  }

  async function save(action: "draft" | "schedule" | "publish_now" | "keep") {
    if (!title.trim()) { setError("Συμπληρώστε τίτλο."); return; }
    if (!slug.trim()) { setError("Συμπληρώστε slug."); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) { setError("Το slug πρέπει να περιέχει μόνο λατινικά γράμματα, αριθμούς και παύλες (π.χ. nea-themata)."); return; }
    if (!body.trim()) { setError("Συμπληρώστε κείμενο."); return; }
    if (action === "schedule" && !publishAt) { setError("Επιλέξτε ημ/νία δημοσίευσης."); return; }

    setSaving(true); setError(null);

    let finalPublishAt: string | null = null;
    if (action === "publish_now") finalPublishAt = new Date().toISOString();
    else if (action === "schedule") finalPublishAt = new Date(publishAt).toISOString();
    else if (action === "keep") finalPublishAt = initial?.publish_at ?? null;
    // draft → null

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      body: body.trim(),
      tag,
      cover_image_url: coverImageUrl || null,
      publish_at: action === "draft" ? null : finalPublishAt,
      created_by: user?.id ?? null,
    };

    if (isEdit) {
      const { error: err } = await supabase.from("posts").update(payload).eq("id", postId!);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from("posts").insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    router.push("/admin/news");
    router.refresh();
  }

  async function remove() {
    if (!postId) return;
    if (!confirm("Διαγραφή άρθρου; Η ενέργεια δεν αναιρείται.")) return;
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("posts").delete().eq("id", postId);
    router.push("/admin/news");
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/news" className="text-xs text-white hover:text-white/70 transition-colors">
          ← Όλα τα άρθρα
        </Link>
        <h1 className="font-display text-3xl text-white mt-2">
          {isEdit ? "Επεξεργασία άρθρου" : "Νέο άρθρο"}
        </h1>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <AdminField label="Τίτλος *" value={title} onChange={onTitleChange} placeholder="π.χ. Νέα θέματα Μαθηματικών" />

        {/* Tag */}
        <div>
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">Κατηγορία</span>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as (typeof TAGS)[number])}
              className="mt-2 w-full bg-transparent border-0 border-b-2 border-white/20 px-0 py-2.5 text-base text-white focus:outline-none focus:border-[#056ef5] transition-colors cursor-pointer"
            >
              {TAGS.map((t) => <option key={t} value={t} className="bg-[#0a0a0f]">{t}</option>)}
            </select>
          </label>
        </div>

        {/* Cover image upload */}
        <div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">Εικόνα εξωφύλλου</span>
          <div className="mt-2 flex items-center gap-3">
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="" className="w-32 h-20 object-cover rounded-lg border border-white/15" />
            ) : (
              <div className="w-32 h-20 rounded-lg border-2 border-dashed border-white/15 grid place-items-center text-white/80 text-xs">
                Καμία
              </div>
            )}
            <div className="space-y-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 text-xs font-bold text-white hover:border-white/40 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
                />
                {uploading ? "Μεταφόρτωση…" : (coverImageUrl ? "Αλλαγή" : "Επιλογή εικόνας")}
              </label>
              {coverImageUrl && (
                <button type="button" onClick={() => setCoverImageUrl("")} className="block text-[10px] text-white/45 hover:text-red-400 transition-colors">
                  Αφαίρεση
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Excerpt */}
        <AdminField label="Σύντομη περιγραφή" value={excerpt} onChange={setExcerpt} placeholder="Εμφανίζεται στις κάρτες και στο email" multiline />

        {/* Body */}
        <AdminField label="Κείμενο άρθρου *" value={body} onChange={setBody} placeholder="Το πλήρες κείμενο. Χρησιμοποιήστε διπλό enter για παραγράφους." multiline rows={10} />

        {/* Publish at */}
        <div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">Ημ/νία δημοσίευσης</span>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="date"
              id="publish-date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="flex-1 bg-transparent border-0 border-b-2 border-white/20 px-0 py-2.5 text-base text-white focus:outline-none focus:border-[#056ef5] transition-colors [color-scheme:dark] cursor-pointer"
            />
            <input
              type="text"
              value={publishTime}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9:]/g, "").slice(0, 5);
                setPublishTime(v);
              }}
              disabled={!publishDate}
              placeholder="ΩΩ:ΛΛ"
              maxLength={5}
              className="w-24 bg-transparent border-0 border-b-2 border-white/20 px-0 py-2.5 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-[#056ef5] transition-colors disabled:opacity-30"
            />
            {publishDate && (
              <button
                type="button"
                onClick={() => { setPublishDate(""); setPublishTime("09:00"); }}
                className="text-white/30 hover:text-white/70 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <span className="block mt-1 text-[10px] text-white/35">
            {publishDate ? "" : "Αφήστε κενό για πρόχειρο. Επιλέξτε μελλοντική ημ/νία για προγραμματισμό."}
          </span>
        </div>

        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
          <button onClick={() => save("draft")} disabled={saving}
            className="px-5 py-2 rounded-full border border-white/20 text-white/70 text-xs font-bold hover:border-white/40 transition-colors disabled:opacity-50 cursor-pointer">
            Αποθήκευση ως πρόχειρο
          </button>
          {publishAt && new Date(publishAt) > new Date() && (
            <button onClick={() => save("schedule")} disabled={saving}
              className="px-5 py-2 rounded-full bg-amber-500 text-ink text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer">
              Προγραμματισμός
            </button>
          )}
          {isEdit && initial?.publish_at ? (
            <button onClick={() => save("keep")} disabled={saving}
              className="px-5 py-2 rounded-full bg-[#056ef5] text-white text-xs font-black uppercase tracking-wider hover:bg-[#0451b8] transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? "…" : "Αποθήκευση"}
            </button>
          ) : (
            <button onClick={() => save("publish_now")} disabled={saving}
              className="px-5 py-2 rounded-full bg-[#056ef5] text-white text-xs font-black uppercase tracking-wider hover:bg-[#0451b8] transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? "…" : "Δημοσίευση τώρα"}
            </button>
          )}
          {isEdit && (
            <button onClick={remove} disabled={saving}
              className="ml-auto px-5 py-2 rounded-full border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer">
              Διαγραφή
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function AdminField({ label, value, onChange, type = "text", placeholder, help, multiline, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; help?: string;
  multiline?: boolean; rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">{label}</span>
      {multiline ? (
        <textarea
          value={value} placeholder={placeholder} rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full bg-transparent border-2 border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#056ef5] transition-colors resize-y"
        />
      ) : (
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          {...(type === "date" || type === "datetime-local" ? { lang: "el-GR" } : {})}
          className="mt-2 w-full bg-transparent border-0 border-b-2 border-white/20 px-0 py-2.5 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-[#056ef5] transition-colors"
        />
      )}
      {help && <span className="block mt-1 text-[10px] text-white/35">{help}</span>}
    </label>
  );
}

function slugify(text: string): string {
  const greekMap: Record<string, string> = {
    'α':'a','ά':'a','β':'b','γ':'g','δ':'d','ε':'e','έ':'e','ζ':'z','η':'i','ή':'i',
    'θ':'th','ι':'i','ί':'i','ϊ':'i','ΐ':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x',
    'ο':'o','ό':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y','ύ':'y','ϋ':'y','ΰ':'y',
    'φ':'f','χ':'ch','ψ':'ps','ω':'o','ώ':'o',
  };
  return text.toLowerCase()
    .split('')
    .map((c) => greekMap[c] ?? c)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
