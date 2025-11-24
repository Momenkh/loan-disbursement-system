import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  DateInput,
  Show,
  SimpleShowLayout,
  ReferenceField,
  SelectInput,
  usePermissions,
  FunctionField,
} from 'react-admin';
import { RollbackDisbursementButton } from '../components/RollbackDisbursementButton';

export const DisbursementList = (props: any) => {

  const { permissions } = usePermissions();
  
  const canDisburse = permissions === 'ADMIN' || permissions === 'STAFF';


  return (
  
    <List {...props}>
      <Datagrid rowClick="show">
        <TextField source="id" />
        <ReferenceField source="loanId" reference="loans" label="Loan">
          <TextField source="id" />
        </ReferenceField>
        <NumberField source="amount" />
        <DateField source="disbursementDate" />
        <TextField source="status" />
        <DateField source="rolledBackAt" />
        <DateField source="createdAt" />
        {canDisburse && (
          <FunctionField
            label="Rollback Disbursement"
            render={(record: any) => (
              // Show rollback when loan is active (disbursed)
              record?.status === 'COMPLETED' ? <RollbackDisbursementButton record={record} /> : null
            )}
          />
        )}
      </Datagrid>
    </List>
  );
}
export const DisbursementCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="loanId" label="Loan ID" />
      <NumberInput source="amount" />
      <DateInput source="disbursementDate" />
      <SelectInput
        source="status"
        choices={[
          { id: 'PENDING', name: 'Pending' },
          { id: 'COMPLETED', name: 'Completed' },
          { id: 'ROLLED_BACK', name: 'Rolled Back' },
        ]}
        defaultValue="PENDING"
      />
    </SimpleForm>
  </Create>
);

export const DisbursementShow = (props: any) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <ReferenceField source="loanId" reference="loans" label="Loan">
        <TextField source="id" />
      </ReferenceField>
      <NumberField source="amount" />
      <DateField source="disbursementDate" />
      <TextField source="status" />
      <DateField source="rolledBackAt" />
      <DateField source="createdAt" />
    </SimpleShowLayout>
  </Show>
);