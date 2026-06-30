import { InlineKeyboard } from 'grammy';
import type { SellerContext } from '@/bot/shared/types.js';
import { renderUI, deleteUserInput, escapeHTML } from '@/bot/shared/ui.js';
import { getCoinCatalog, validateWalletAddress } from '@/lib/services/coin';
import prisma from '@/lib/prisma';

export async function handleWallet(ctx: SellerContext) {
  await deleteUserInput(ctx);

  const userId = ctx.user.id;
  const pm = await prisma.paymentMethod.findUnique({
    where: { userId },
    include: { coin: true, network: true },
  });

  let text: string;
  if (pm) {
    text =
      `💰 <b>Your USDT Wallet</b>\n\n` +
      `• Coin: <b>${escapeHTML(pm.coin.symbol)}</b> (${escapeHTML(pm.coin.name)})\n` +
      `• Network: <b>${escapeHTML(pm.network.name)}</b>\n` +
      `• Address: <code>${escapeHTML(pm.address)}</code>\n` +
      `• Type: <b>${pm.isBinanceWallet ? 'Binance' : 'External'}</b>\n\n` +
      `<i>${pm.isBinanceWallet ? '✅ No minimum payout.' : '⚠️ Min $10 per batch.'}</i>`;
  } else {
    text =
      `💰 <b>USDT Wallet</b>\n\n` +
      `❌ <b>No wallet configured.</b>\n\n` +
      `Set up a wallet to receive payments for your gift cards.`;
  }

  const kb = new InlineKeyboard()
    .text(pm ? '✏️ Update' : '➕ Configure', 'wallet_configure')
    .row();

  if (pm) {
    kb.text('🗑️ Remove', 'wallet_delete');
  }

  kb.row().text('🏠 Back', 'start');

  await renderUI(ctx, text, { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleWalletConfigure(ctx: SellerContext) {
  await deleteUserInput(ctx);

  const coins = await getCoinCatalog();
  if (coins.length === 0) {
    await renderUI(ctx, '❌ No coins available. Please contact admin.', { parse_mode: 'HTML' });
    return;
  }

  ctx.session.wizard.step = 'awaitingCoinSelection';

  const kb = new InlineKeyboard();
  for (const coin of coins) {
    kb.text(`${coin.symbol} — ${coin.name}`, `wallet_coin_${coin.id}`).row();
  }
  kb.text('❌ Cancel', 'wallet_cancel');

  await renderUI(ctx, '🪙 <b>Select a coin:</b>', { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleWalletCoinSelected(ctx: SellerContext, coinId: string) {
  await deleteUserInput(ctx);

  const coins = await getCoinCatalog();
  const coin = coins.find((c) => c.id === coinId);
  if (!coin) {
    await renderUI(ctx, '❌ Coin not found.', { parse_mode: 'HTML' });
    return;
  }

  ctx.session.wizard.step = 'awaitingNetworkSelection';
  ctx.session.wizard.regName = coinId;

  if (coin.networks.length === 0) {
    await renderUI(ctx, `❌ No networks available for ${coin.symbol}.`, { parse_mode: 'HTML' });
    return;
  }

  const kb = new InlineKeyboard();
  for (const cn of coin.networks) {
    kb.text(cn.network.name, `wallet_network_${cn.networkId}`).row();
  }
  kb.text('❌ Cancel', 'wallet_cancel');

  await renderUI(ctx, `🔗 <b>Select network for ${escapeHTML(coin.symbol)}:</b>`, {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
}

export async function handleWalletNetworkSelected(ctx: SellerContext, networkId: string) {
  await deleteUserInput(ctx);

  const coinId = ctx.session.wizard.regName;
  if (!coinId) {
    await renderUI(ctx, '❌ Session error. Please start over.', { parse_mode: 'HTML' });
    return;
  }

  ctx.session.wizard.step = 'awaitingAddress';
  ctx.session.wizard.regEmail = networkId;

  const coins = await getCoinCatalog();
  const coin = coins.find((c) => c.id === coinId);
  const network = coin?.networks.find((cn) => cn.networkId === networkId)?.network;

  const kb = new InlineKeyboard().text('❌ Cancel', 'wallet_cancel');

  await renderUI(
    ctx,
    `📍 <b>Enter your ${escapeHTML(network?.name || 'network')} wallet address:</b>\n\n` +
      `<i>Paste your address in the next message.</i>`,
    { parse_mode: 'HTML', reply_markup: kb },
  );
}

export async function handleWalletAddressInput(ctx: SellerContext, address: string) {
  const coinId = ctx.session.wizard.regName;
  const networkId = ctx.session.wizard.regEmail;

  if (!coinId || !networkId) {
    await renderUI(ctx, '❌ Session error. Please start over.', { parse_mode: 'HTML' });
    return;
  }

  const coins = await getCoinCatalog();
  const coin = coins.find((c) => c.id === coinId);
  const networkLink = coin?.networks.find((cn) => cn.networkId === networkId);
  const network = networkLink?.network;

  if (!network) {
    await renderUI(ctx, '❌ Network not found.', { parse_mode: 'HTML' });
    return;
  }

  if (!validateWalletAddress(address, network.regex)) {
    const kb = new InlineKeyboard().text('❌ Cancel', 'wallet_cancel');
    await renderUI(
      ctx,
      `❌ <b>Invalid address</b> for ${escapeHTML(network.name)}.\n\n` +
        `Expected: <code>${escapeHTML(network.regex)}</code>\n\n` +
        `Try again:`,
      { parse_mode: 'HTML', reply_markup: kb },
    );
    return;
  }

  (ctx.session.wizard as Record<string, unknown>).regPassword = address;
  ctx.session.wizard.step = 'awaitingWalletType';

  const kb = new InlineKeyboard()
    .text('🏦 Binance', 'wallet_type_binance')
    .row()
    .text('🔗 External', 'wallet_type_external')
    .row()
    .text('❌ Cancel', 'wallet_cancel');

  await renderUI(ctx, '🏦 <b>Wallet type:</b>', {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
}

export async function handleWalletType(ctx: SellerContext, isBinance: boolean) {
  await deleteUserInput(ctx);

  const coinId = ctx.session.wizard.regName;
  const networkId = ctx.session.wizard.regEmail;
  const address = (ctx.session.wizard as Record<string, unknown>).regPassword as string | undefined;

  if (!coinId || !networkId || !address) {
    await renderUI(ctx, '❌ Session error. Please start over.', { parse_mode: 'HTML' });
    return;
  }

  try {
    const userId = ctx.user.id;
    const pm = await prisma.paymentMethod.upsert({
      where: { userId },
      create: { userId, coinId, networkId, address, isBinanceWallet: isBinance },
      update: { coinId, networkId, address, isBinanceWallet: isBinance },
      include: { coin: true, network: true },
    });

    ctx.session.wizard = { step: 'idle' };

    const kb = new InlineKeyboard().text('🏠 Back', 'start');

    await renderUI(
      ctx,
      `✅ <b>Wallet saved!</b>\n\n` +
        `• <b>${escapeHTML(pm.coin.symbol)}</b> / ${escapeHTML(pm.network.name)}\n` +
        `• <code>${escapeHTML(pm.address)}</code>\n` +
        `• ${pm.isBinanceWallet ? 'Binance' : 'External'}`,
      { parse_mode: 'HTML', reply_markup: kb },
    );
  } catch (error) {
    ctx.session.wizard = { step: 'idle' };
    const msg = error instanceof Error ? error.message : 'Unknown error';
    await renderUI(ctx, `❌ Error: ${escapeHTML(msg)}`, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('🔄 Try Again', 'wallet_configure').row().text('🏠 Back', 'start'),
    });
  }
}

export async function handleWalletDelete(ctx: SellerContext) {
  await deleteUserInput(ctx);

  try {
    await prisma.paymentMethod.deleteMany({ where: { userId: ctx.user.id } });
    const kb = new InlineKeyboard().text('🏠 Back', 'start');
    await renderUI(ctx, '✅ <b>Wallet removed.</b>', {
      parse_mode: 'HTML',
      reply_markup: kb,
    });
  } catch {
    await renderUI(ctx, '❌ Error removing wallet.', { parse_mode: 'HTML' });
  }
}

export async function handleWalletCancel(ctx: SellerContext) {
  ctx.session.wizard = { step: 'idle' };
  await deleteUserInput(ctx);
  await handleWallet(ctx);
}
