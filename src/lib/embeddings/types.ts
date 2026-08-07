export interface EmbeddingProvider {
  name: string;
  embed(text: string): Promise<number[]>;
}
