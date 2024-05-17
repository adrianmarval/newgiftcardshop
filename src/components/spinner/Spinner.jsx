export const Spinner = () => {
  return (
    <div className='flex h-96 items-center justify-center'>
      <div
        className='h-24 w-24 animate-spin items-center rounded-full
              border-y-8 border-solid border-black border-t-transparent shadow-md'
      ></div>
    </div>
  );
};
