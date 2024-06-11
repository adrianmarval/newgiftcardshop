'use client';
import { Brand, Country, Giftcard, Origin } from '@/interfaces/giftcard-interface';
import { addGiftcardFormSchema } from '@/validations';
import toast from 'react-hot-toast';

interface Props {
  handleAddGiftcad: (newGiftcard: Giftcard) => void;
}

export const AddGiftCardForm = ({ handleAddGiftcad }: Props) => {
  const handleSubmit = async (formData: FormData) => {
    const newGiftcard = {
      _id: crypto.randomUUID(),
      brand: formData.get('brand') as Brand,
      country: formData.get('country') as Country,
      origin: formData.get('origin') as Origin,
      amount: formData.get('amount') as string,
      claimCode: formData.get('claimCode') as string,
    };

    const result = addGiftcardFormSchema.safeParse(newGiftcard);

    if (!result.success) {
      let errorMessage = '';

      result.error.issues.forEach((issue) => {
        errorMessage = errorMessage + issue.path[0] + ': ' + issue.message + '. ';
      });
      toast.error(errorMessage);
      return;
    }

    handleAddGiftcad(result.data);
  };

  return (
    <form action={handleSubmit}>
      <fieldset className="mb-4">
        <legend className="block text-sm font-medium leading-3 text-gray-900">Que quieres vender?</legend>
        <div className="mt-2 flex space-x-4 py-1.5">
          <label className="flex cursor-pointer items-center">
            <input name="brand" id="amazon" type="radio" value="amazon" className="h-4 w-4 cursor-pointer border-gray-300" />
            <span className="ml-2 block text-sm font-medium text-gray-700">Amazon</span>
          </label>
          <label className="flex cursor-pointer items-center">
            <input name="brand" id="apple" type="radio" value="apple" className="h-4 w-4 cursor-pointer border-gray-300" />
            <span className="ml-2 block text-sm font-medium text-gray-700">Apple</span>
          </label>
        </div>
      </fieldset>

      <div className="mb-4">
        <label htmlFor="country" className="block text-sm font-medium leading-3 text-gray-900">
          País
        </label>
        <select
          name="country"
          id="country"
          className="mt-2 block w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
        >
          <option value="us">United States</option>
          <option value="ca">Canada</option>
          <option value="uk">United Kingdom</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="origin" className="block text-sm font-medium leading-3 text-gray-900">
          Procedencia
        </label>
        <select
          name="origin"
          id="origin"
          className="mt-2 block w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
        >
          <option value="surveys">Encuestas</option>
          <option value="studies">Estudios</option>
          <option value="offers">Offers</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="claimCode" className="block text-sm font-medium leading-3 text-gray-900">
          Monto
        </label>
        <input
          type="number"
          step="0.01"
          id="amount"
          name="amount"
          placeholder="Ingresa el monto"
          className="mt-2 block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="claimCode" className="block text-sm font-medium leading-3 text-gray-900">
          Código de Canje
        </label>
        <input
          type="text"
          id="claimCode"
          name="claimCode"
          placeholder="Ingresa el código de la tarjeta"
          className="mt-2 block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6"
        />
      </div>
      <button type="submit" className="font-extraLigth rounded-lg bg-black px-4 py-2 text-xs text-white ">
        Agregar tarjeta
      </button>
    </form>
  );
};
