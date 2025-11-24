import {
  List, Datagrid, TextField, Create, SimpleForm, TextInput,
} from 'react-admin';

export const RollbackList = (props: any) => (
  <List {...props}>
    <Datagrid>
      <TextField source="id" />
      <TextField source="transactionId" />
      <TextField source="reason" />
      <TextField source="rolledBackBy" />
      <TextField source="createdAt" />
    </Datagrid>
  </List>
);

export const RollbackCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="transactionId" />
      <TextInput source="reason" />
      <TextInput source="rolledBackBy" />
    </SimpleForm>
  </Create>
);
