import {
  List, Datagrid, TextField, NumberField, Create, SimpleForm, SelectInput, TextInput,
  NumberInput,
} from 'react-admin';

export const LedgerList = (props: any) => (
  <List {...props}>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <TextField source="transactionType" />
      <TextField source="debitAccountId" />
      <TextField source="creditAccountId" />
      <NumberField source="amount" />
      <TextField source="transactionId" />
    </Datagrid>
  </List>
);

export const LedgerCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <SelectInput source="transactionType" choices={[
        { id: 'DISBURSEMENT', name: 'DISBURSEMENT' },
        { id: 'REPAYMENT', name: 'REPAYMENT' },
      ]} />
      <TextInput source="debitAccountId" />
      <TextInput source="creditAccountId" />
      <NumberInput source="amount" />
    </SimpleForm>
  </Create>
);
