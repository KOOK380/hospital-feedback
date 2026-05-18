# Task 2: Add Survey Link Share Options

## Summary
Added share options for each survey card in the surveys page.

## Changes Made

### File Modified: `/home/z/my-project/src/components/surveys/surveys-page.tsx`

1. **New imports added** from `lucide-react`:
   - `Share2`, `Copy`, `Check`, `QrCode`, `ExternalLink`, `MessageCircle`, `Mail`

2. **New imports added** for Dialog and toast:
   - `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` from `@/components/ui/dialog`
   - `toast` from `sonner`

3. **New state variables**:
   - `shareSurveyId` - tracks which survey's share dialog is open
   - `copied` - tracks copy-to-clipboard feedback state

4. **Survey card actions changed** from `Edit | Responses | Delete` to `Edit | Share | Take | Delete`:
   - **Share** button: Opens the share dialog (sky-blue colored)
   - **Take** button: Navigates to take-survey page via `setSelectedSurveyId` + `setActivePage('take-survey')`
   - **Edit** button: Unchanged
   - **Delete** button: Unchanged (still pushed to right with `ml-auto`)

5. **Share Survey Dialog** added with:
   - **Survey Link** section: Displays the full link (`https://survey.hospital.com/s/{surveyId}`) with a "Copy Link" button that copies to clipboard, shows a toast, and toggles to "Copied" with a checkmark for 2 seconds
   - **QR Code** section: A styled placeholder with a large QrCode icon, "QR Code" text, and the survey link displayed below
   - **Share Via** section: Three buttons for WhatsApp (`wa.me`), Email (`mailto:`), and SMS (`sms:`), each with the appropriate URL scheme and encoded survey link

## Lint Status
Passed cleanly with no errors.
