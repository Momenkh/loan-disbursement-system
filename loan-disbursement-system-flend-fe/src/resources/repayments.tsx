import {
  List, Datagrid, TextField, NumberField, DateField, Create, SimpleForm, TextInput, NumberInput,
} from 'react-admin';

export const RepaymentList = (props: any) => (
  <List {...props}>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <TextField source="loanId" />
      <TextField source="clientId" />
      <NumberField source="amount" />
      <DateField source="paymentDate" />
    </Datagrid>
  </List>
);

export const RepaymentCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="loanId" />
      <TextInput source="clientId" />
      <NumberInput source="amount" />
      <TextInput source="paymentDate" />
    </SimpleForm>
  </Create>
);
