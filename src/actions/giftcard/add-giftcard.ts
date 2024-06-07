'use server';

export const addGiftcard = async (formData: FormData) => {
  try {
    const store = formData.get('store');
    const country = formData.get('country');
    const origin = formData.get('origin');
    const amount = formData.get('amount');
    const claimCode = formData.get('claimCode');

    console.log({ store, country, origin, amount, claimCode });
  } catch (error) {
    console.log(error);
    throw new Error('No se pudo agregar la tarjeta de regalo');
  }
};
