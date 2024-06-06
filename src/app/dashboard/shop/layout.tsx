interface Props {
  children: React.ReactNode;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const layout = ({ children }: Props) => {
  return <div>{children}</div>;
};

export default layout;
