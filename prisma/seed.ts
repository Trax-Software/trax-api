import { PrismaClient, Role, CampaignObjective, AdPlatform, CampaignStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding...');

  // 1. Limpar dados existentes (opcional, mas recomendado para ambiente de dev)
  // Ordem reversa das relações para evitar erros de chave estrangeira
  await prisma.auditLog.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.aiLog.deleteMany();
  await prisma.adCreative.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Banco de dados limpo.');

  // 2. Criar Usuários
  const passwordHash = await argon2.hash('password123');

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@trax.com',
      password: passwordHash,
      name: 'Admin Trax',
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: 'member@trax.com',
      password: passwordHash,
      name: 'João Silva',
    },
  });

  console.log('👤 Usuários criados.');

  // 3. Criar Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Trax Marketing Co.',
      description: 'Workspace principal para campanhas de marketing',
      brandName: 'Trax',
      brandVoice: 'Inovadora e Direta',
      brandColors: ['#3B82F6', '#1F2937'],
      credits: 5000,
    },
  });

  console.log('🏢 Workspace criado.');

  // 4. Vincular Usuários ao Workspace
  await prisma.workspaceMember.createMany({
    data: [
      {
        userId: adminUser.id,
        workspaceId: workspace.id,
        role: Role.OWNER,
      },
      {
        userId: memberUser.id,
        workspaceId: workspace.id,
        role: Role.MEMBER,
      },
    ],
  });

  console.log('👥 Membros vinculados ao workspace.');

  // 5. Criar Campanhas
  const campaign1 = await prisma.campaign.create({
    data: {
      name: 'Lançamento Verão 2026',
      objective: CampaignObjective.SALES,
      platform: AdPlatform.META,
      targetAudience: 'Jovens de 18 a 35 anos interessados em tecnologia e moda.',
      keyBenefits: 'Design exclusivo, alta durabilidade e estilo moderno.',
      brandTone: 'Jovial',
      status: CampaignStatus.PUBLISHED,
      productName: 'Trax Watch 2.0',
      productCategory: 'Wearables',
      productPrice: 299.90,
      workspaceId: workspace.id,
      createdBy: adminUser.id,
      description: 'Campanha focada no aumento de vendas do novo Trax Watch.',
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      name: 'Captação de Leads B2B',
      objective: CampaignObjective.LEADS,
      platform: AdPlatform.LINKEDIN,
      targetAudience: 'Gestores de marketing e CEOs de agências.',
      keyBenefits: 'Automação inteligente e relatórios em tempo real.',
      brandTone: 'Corporativo',
      status: CampaignStatus.DRAFT,
      workspaceId: workspace.id,
      createdBy: adminUser.id,
      description: 'Atração de novos parceiros para a plataforma.',
    },
  });

  console.log('🚀 Campanhas criadas.');

  // 6. Criar Criativos para a Campanha 1
  await prisma.adCreative.createMany({
    data: [
      {
        name: 'Criativo 1 - Lifestyle',
        headline: 'O futuro no seu pulso.',
        primaryText: 'Conheça o novo Trax Watch 2.0. Estilo e tecnologia em um só lugar.',
        campaignId: campaign1.id,
        isSelected: true,
        aiModel: 'gpt-4o',
      },
      {
        name: 'Criativo 2 - Minimalista',
        headline: 'Trax Watch: Simplesmente elegante.',
        primaryText: 'Garanta o seu hoje mesmo com frete grátis.',
        campaignId: campaign1.id,
        isSelected: false,
        aiModel: 'claude-3-5-sonnet',
      },
    ],
  });

  console.log('🎨 Criativos de anúncios criados.');

  // 7. Criar Log de IA
  await prisma.aiLog.create({
    data: {
      workspaceId: workspace.id,
      userId: adminUser.id,
      provider: 'OpenAI',
      model: 'gpt-4o',
      type: 'TEXT_GENERATION',
      inputTokens: 150,
      outputTokens: 300,
      totalTokens: 450,
    },
  });

  console.log('📊 Log de IA criado.');

  console.log('✅ Seeding concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
