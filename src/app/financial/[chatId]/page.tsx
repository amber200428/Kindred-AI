import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type FinancialChatRedirectProps = {
  params: Promise<{ chatId: string }>;
};

export default async function FinancialChatRedirectPage({
  params,
}: FinancialChatRedirectProps) {
  await params;
  redirect('/?persona=financial');
}
