export interface InfoAsset {
  id: string;
  type: 'course' | 'ticket' | 'leak' | 'report';
  title: string;
  description: string;
  sellerAddress: string;
  priceSats: number;
  thumbnailUrl: string;
  tags: string[];
}

export const mockInfoAssets: InfoAsset[] = [
  {
    id: '1',
    type: 'course',
    title: 'Curso Completo de Criptografia Pós-Quântica',
    description: 'Aprenda os fundamentos da criptografia que resistirá aos computadores quânticos. Inclui 10 módulos e certificado NFT.',
    sellerAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    priceSats: 150000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1932',
    tags: ['educação', 'criptografia', 'segurança'],
  },
  {
    id: '2',
    type: 'ticket',
    title: 'Ingresso VIP - Show da Banda "The Cypherpunks"',
    description: 'Acesso exclusivo ao backstage e open bar. O ingresso é transferível até 24h antes do evento.',
    sellerAddress: 'bc1q9z4g5z6h8j0k2l4m6n8p0q2s4t6v8y0x2z4c6e',
    priceSats: 75000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?q=80&w=2070',
    tags: ['evento', 'música', 'show'],
  },
  {
    id: '3',
    type: 'leak',
    title: 'Documentos Internos - Projeto "Panopticon"',
    description: 'Análise de 50 páginas sobre a arquitetura do sistema de vigilância global.',
    sellerAddress: 'bc1q8c7h6k4g9j3l2m5n7p9q3s5t7v9y1x3z5c7e9g',
    priceSats: 500000,
    thumbnailUrl: 'https://images.unsplash.com/photo-1550537612-96df5005f18b?q=80&w=1936',
    tags: ['vazamento', 'privacidade', 'investigação'],
  },
];