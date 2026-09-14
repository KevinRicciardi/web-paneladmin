import type { PodcastEpisode, PodcastEpisodePayload } from "../types";

const MOCK_EPISODIOS_INICIALES: PodcastEpisode[] = [
  {
    id: 1,
    tenantId: 0,
    title: "Episodio 1",
    description: "Una charla breve para poner en marcha la semana.",
    podcastName: "Historias de la semana",
    coverImageUrl: null,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "05:32",
    publishedAt: new Date().toISOString(),
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    tenantId: 0,
    title: "Episodio 2",
    description: "Novedades, entrevistas y las voces de nuestra comunidad.",
    podcastName: "Historias de la semana",
    coverImageUrl: null,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "06:18",
    publishedAt: null,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function storageKey(tenantId: number) {
  return `podcast_episodes_mock_${tenantId}`;
}

function readEpisodes(tenantId: number): PodcastEpisode[] {
  try {
    const stored = localStorage.getItem(storageKey(tenantId));
    if (stored) return JSON.parse(stored) as PodcastEpisode[];
  } catch {
    // Una caché inválida se reemplaza por los datos iniciales de prueba.
  }
  return MOCK_EPISODIOS_INICIALES.map((episode) => ({ ...episode, tenantId }));
}

function writeEpisodes(tenantId: number, episodes: PodcastEpisode[]) {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(episodes));
}

export async function listarMisPodcasts(tenantId: number): Promise<PodcastEpisode[]> {
  return readEpisodes(tenantId);
}

export async function crearPodcast(tenantId: number, payload: PodcastEpisodePayload): Promise<PodcastEpisode> {
  const now = new Date().toISOString();
  const episode: PodcastEpisode = {
    ...payload,
    id: Date.now(),
    tenantId,
    coverImageUrl: payload.coverImageUrl || null,
    publishedAt: payload.status === "published" ? payload.publishedAt || now : null,
    createdAt: now,
    updatedAt: now,
  };
  const episodes = [episode, ...readEpisodes(tenantId)];
  writeEpisodes(tenantId, episodes);
  return episode;
}

export async function actualizarPodcast(
  tenantId: number,
  id: number,
  payload: Partial<PodcastEpisodePayload>,
): Promise<PodcastEpisode> {
  const episodes = readEpisodes(tenantId);
  const current = episodes.find((episode) => episode.id === id);
  if (!current) throw new Error("El episodio no está disponible.");
  const updated: PodcastEpisode = {
    ...current,
    ...payload,
    coverImageUrl: payload.coverImageUrl || null,
    publishedAt: payload.status === "published"
      ? payload.publishedAt || current.publishedAt || new Date().toISOString()
      : null,
    updatedAt: new Date().toISOString(),
  };
  writeEpisodes(tenantId, episodes.map((episode) => episode.id === id ? updated : episode));
  return updated;
}

export async function eliminarPodcast(tenantId: number, id: number): Promise<void> {
  writeEpisodes(tenantId, readEpisodes(tenantId).filter((episode) => episode.id !== id));
}
