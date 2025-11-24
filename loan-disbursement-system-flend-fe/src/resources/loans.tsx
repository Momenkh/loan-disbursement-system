import {
  List, Datagrid, TextField, NumberField, DateField, EditButton,
  Create, SimpleForm, NumberInput, Show, SimpleShowLayout, Edit,
  ReferenceField, ReferenceInput, SelectInput, 
  FunctionField,
  usePermissions
} from 'react-admin';
import { RepaymentScheduleButton } from '../components/RepaymentScheduleButton';
import { LoanApprovalButton } from '../components/LoanApprovalButton';
import { DisburseLoanButton } from '../components/DisburseLoanButton';
import { MakePaymentButton } from '../components/payments/MakePaymentButton';
import { PaymentHistoryButton } from '../components/payments/PaymentHistoryButton';
import { CalculateDuesButton } from '../components/payments/CalculateDuesButton';


export const LoanList = (props: any) => {
  const { permissions } = usePermissions();
  
  const canApprove = permissions === 'ADMIN' || permissions === 'CEO';
  const canDisburse = permissions === 'ADMIN' || permissions === 'STAFF';

  return (
    <List {...props}>
      <Datagrid rowClick="show">
        <TextField source="id" />
        <ReferenceField source="clientId" reference="clients">
          <TextField source="name" />
        </ReferenceField>
        <NumberField source="amount" />
        <NumberField source="numberOfInstallments" />
        <NumberField source="interestRate" />
        <NumberField source="tenor" />
        <TextField source="status" />
        <DateField source="createdAt" />
        
        {canApprove && (
          <FunctionField
            label="Approval"
            render={(record: any) => (
              record?.status === 'PENDING' ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <LoanApprovalButton record={record} />
                </div>
              ) : null
            )}
          />
        )}

        {canDisburse && (
          <FunctionField
            label="Disburse"
            render={(record: any) => (
              // Only show disburse when loan is approved
              record?.status === 'APPROVED' ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <DisburseLoanButton record={record} />
                </div>
              ) : null
            )}
          />
        )}
        
        <FunctionField
          label="Payments"
          render={(record: any) => (
            <div onClick={(e) => e.stopPropagation()}>
              <MakePaymentButton record={record} />
              <PaymentHistoryButton record={record} />
              <CalculateDuesButton record={record} />
            </div>
          )}
        />

        <FunctionField
          label="Installments"
          render={(record: any) => (
            <div onClick={(e) => e.stopPropagation()}>
              <RepaymentScheduleButton record={record} />
            </div>
          )}
        />

        <EditButton />
      </Datagrid>
    </List>
  );
};


export const LoanCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
        <ReferenceInput source="clientId" reference="clients">
          <SelectInput optionText="name" optionValue="id" />
        </ReferenceInput>
      <NumberInput source="amount" />
      <NumberInput source="numberOfInstallments" />
      <NumberInput source="interestRate" />
      <NumberInput source="tenor" />
    </SimpleForm>
  </Create>
);

export const LoanEdit = (props: any) => {

    const record = props.record;

    if ( record && record.status !== 'PENDING') {
        return <div>Only loans with PENDING status can be edited.</div>;
    }

    return (
        <Edit {...props}>
            <SimpleForm>
                <NumberInput source="amount" parse={v => Number(v)}/>
                <NumberInput source="numberOfInstallments" parse={v => Number(v)}/>
                <NumberInput source="interestRate" parse={v => Number(v)} />
                <NumberInput source="tenor" parse={v => Number(v)}/>
            </SimpleForm>
        </Edit>
    );
};

export const LoanShow = (props: any) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
        <ReferenceField source="clientId" reference="clients">
          <TextField source="name" />
        </ReferenceField>
      <NumberField source="amount" />
      <NumberField source="numberOfInstallments" />
      <NumberField source="interestRate" />
      <NumberField source="tenor" />
      <TextField source="status" />
      <DateField source="createdAt" />
    </SimpleShowLayout>
  </Show>
);
