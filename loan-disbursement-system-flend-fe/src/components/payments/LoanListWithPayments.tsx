// import { Box } from "@mui/material";
// import { Datagrid, DateField, FunctionField, List, NumberField, TextField } from "react-admin";
// import { MakePaymentButton } from "./MakePaymentButton";
// import { PaymentHistoryButton } from "./PaymentHistoryButton";
// import { CalculateDuesButton } from "./CalculateDuesButton";


// export const LoanListWithPayments = (props: any) => (
//   <List {...props}>
//     <Datagrid rowClick="show">
//       <TextField source="id" />
//       <NumberField source="amount" />
//       <TextField source="status" />
//       <DateField source="createdAt" />
//       <FunctionField
//         label="Actions"
//         render={(record: any) => (
//           <Box sx={{ display: 'flex', gap: 1 }}>
//             <MakePaymentButton record={record} />
//             <PaymentHistoryButton record={record} />
//             <CalculateDuesButton record={record} />
//           </Box>
//         )}
//       />
//     </Datagrid>
//   </List>
// )