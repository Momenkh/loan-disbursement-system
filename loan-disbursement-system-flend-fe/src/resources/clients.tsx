import {
  List, Datagrid, TextField, EmailField, EditButton, DeleteButton,
  Create, SimpleForm, TextInput,
  Edit, SimpleForm as EditForm, Show, SimpleShowLayout, DateField,
} from 'react-admin';

export const ClientList = (props: any) => (
  <List {...props}>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <TextField source="name" />
      <EmailField source="email" />
      <TextField source="phoneNumber" />
      <DateField source="createdAt" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const ClientCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="name" />
      <TextInput source="email" />
      <TextInput source="phoneNumber" />
    </SimpleForm>
  </Create>
);

export const ClientEdit = (props: any) => (
  <Edit {...props}>
    <EditForm>
      <TextInput source="name" />
      <TextInput source="email" />
      <TextInput source="phoneNumber" />
    </EditForm>
  </Edit>
);

export const ClientShow = (props: any) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" />
      <EmailField source="email" />
      <TextField source="phoneNumber" />
      <DateField source="createdAt" />
    </SimpleShowLayout>
  </Show>
);
