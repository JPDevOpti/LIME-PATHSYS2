import { EditCasePageContent } from '@/features/cases/components/EditCasePageContent';

export const dynamicParams = false;

export async function generateStaticParams() {
    return [{ id: 'placeholder' }];
}

type Props = {
    params: { id: string };
};

export default function EditCaseByIdPage({ params }: Props) {
    const { id } = params;
    return <EditCasePageContent caseId={id} />;
}
