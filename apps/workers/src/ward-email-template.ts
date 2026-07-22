export type WardEmailComplaint = Readonly<{
  complaintNumber: string;
  categoryName: string;
  wardName: string;
  description: string;
  submittedAt: string;
  latitude?: number | null;
  longitude?: number | null;
}>;

export const renderWardComplaintEmail = (complaint: WardEmailComplaint) => ({
  subject: `[JagrukSetu] Complaint ${complaint.complaintNumber} – ${complaint.categoryName}`,
  text: [
    'Dear Ward Office,',
    '',
    'A civic complaint has been routed to your office through JagrukSetu.',
    '',
    `Complaint number: ${complaint.complaintNumber}`,
    `Ward: ${complaint.wardName}`,
    `Category: ${complaint.categoryName}`,
    `Submitted: ${complaint.submittedAt}`,
    '',
    'Description:',
    complaint.description,
    '',
    'Please acknowledge and process this complaint according to your normal procedure.',
    'This message contains no citizen contact details or private media.',
    '',
    'Regards,',
    'JagrukSetu',
  ].join('\n'),
});
