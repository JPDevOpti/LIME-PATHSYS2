import { EditPatientPageContent } from '@/app/(pages)/(clinical)/patients/edit/EditPatientPageContent';

export const dynamicParams = false;

export async function generateStaticParams() {
    return [{ id: 'placeholder' }];
}

type Props = {
    params: { id: string };
};

export default function EditPatientByIdPage({ params }: Props) {
    const { id } = params;
    return <EditPatientPageContent patientId={id} />;
}
