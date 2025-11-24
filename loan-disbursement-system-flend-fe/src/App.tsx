import { Admin, Resource } from 'react-admin';
import dataProvider from './dataProvider';
import authProvider from './authProvider';

import { ClientList, ClientCreate, ClientEdit, ClientShow } from './resources/clients';
import { LoanList, LoanCreate, LoanEdit, LoanShow } from './resources/loans';
import { DisbursementList, DisbursementCreate, DisbursementShow } from './resources/disbursements';
import { RepaymentList, RepaymentCreate } from './resources/repayments';
import { LedgerList, LedgerCreate } from './resources/ledger';
import { RollbackList, RollbackCreate } from './resources/rollbacks';

export const App = () => (
  <Admin dataProvider={dataProvider} authProvider={authProvider}>
    <Resource name="clients" list={ClientList} create={ClientCreate} edit={ClientEdit} show={ClientShow} />
    <Resource name="loans" list={LoanList} create={LoanCreate} edit={LoanEdit} show={LoanShow} />
    <Resource name="disbursements" list={DisbursementList} create={DisbursementCreate} show={DisbursementShow} />
    <Resource name="repayments" list={RepaymentList} create={RepaymentCreate} />
    <Resource name="ledger" list={LedgerList} create={LedgerCreate} />
    <Resource name="rollbacks" list={RollbackList} create={RollbackCreate} />
  </Admin>
);

export default App;
