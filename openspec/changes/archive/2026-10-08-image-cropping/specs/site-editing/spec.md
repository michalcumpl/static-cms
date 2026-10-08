## ADDED Requirements

### Requirement: Cropping and rotating images
The editor SHALL offer a crop dialog that shows an image whole, with a crop frame over it. In the dialog the owner SHALL be able to:
- turn the picture a quarter turn left or right, as often as needed;
- move the frame by dragging it, and resize it by dragging its corners and edges;
- move the frame with the arrow keys and resize it with Shift and the arrow keys;
- choose the frame's shape: free, 1:1, 4:3, 3:2 or 16:9, plus "As shown here" when the dialog was opened for a placed image whose block shows it in a fixed shape;
- reset the frame to the whole picture, save, or cancel.

The frame SHALL always stay within the picture, keep the chosen shape, and be at least 64 pixels of the image wide and high. The dialog SHALL open with the previous turn and frame when the image was itself made by an edit, and otherwise with the largest frame of the chosen shape, centred. Saving SHALL create the edited image in the library (see the media capability's "Editing images"), showing progress while the server works and the server's reason when it refuses. Cancelling SHALL change nothing.

The dialog SHALL be opened in four places:
- **the media library dialog**: "Edit" on the selected image. The new image SHALL appear first in the list and be selected, and the source SHALL stay in the list.
- **the Image panel**: "Crop and rotate" for the selected image. The shape SHALL start as "As shown here" where the block has one, otherwise free.
- **the image field of the list forms** (people, testimonials, projects): "Crop and rotate" for the item's image, in the same way.
- **the share image settings** of the site and of a page: "Crop and rotate" for the share image, in the same way.

The fixed shapes SHALL be 4:3 for a gallery item in a gallery whose look is `fill` and for a card, 16:10 for a project's cover, 1:1 for a person's portrait and a testimonial's photo, and 1200:630 for a share image. When saved from the Image panel, a form or a share image setting, the new image SHALL replace the image in that use only, keeping its description and decorative flag and resetting its focal point to the centre, as one undoable step. Crop and rotate SHALL NOT be offered where the image can't be replaced (collection items' images outside the primary language).

#### Scenario: Crop a portrait from a group photo
- **WHEN** the owner selects a person's portrait, uses "Crop and rotate", moves the 1:1 frame over the person's face and saves
- **THEN** the portrait on the canvas shows the cropped image, its description is unchanged, the library lists the crop and the group photo, and one undo brings back the group photo

#### Scenario: Turn a sideways photo in the library
- **WHEN** the owner selects a sideways photo in the library dialog, uses "Edit", turns it right and saves
- **THEN** the upright photo appears first in the library, selected, and the sideways photo is still listed

#### Scenario: Re-crop
- **WHEN** the owner opens "Crop and rotate" for an image that was cropped earlier
- **THEN** the dialog shows the whole source picture with the earlier frame, and the frame can be widened past the earlier crop

#### Scenario: Frame kept in shape
- **WHEN** the owner drags a corner of a 4:3 frame beyond the edge of the picture
- **THEN** the frame stops at the edge and stays 4:3

#### Scenario: Keyboard only
- **WHEN** the owner chooses the square shape, tabs to the crop frame, presses the right arrow three times and Shift and the up arrow twice, then saves
- **THEN** the saved crop is the square frame moved right and made smaller, still square

#### Scenario: Cancel
- **WHEN** the owner turns the picture and moves the frame, then cancels
- **THEN** nothing is added to the library and the document is unchanged

### Requirement: Focal point
For every image whose focal point the site can use, the Image panel and the image field of the list forms SHALL offer a focal point control: a small view of the whole image with a marker at the focal point. Clicking or tapping the view SHALL move the point there. With the control focused, the arrow keys SHALL move it by 1 and Shift and the arrow keys by 10, within 0 to 100. "Centre" SHALL put it back to 50, 50. The canvas SHALL show the image framed on its focal point as the site does. A click SHALL be one undoable step, and a series of key presses SHALL merge into one. Replacing an image with a different one SHALL reset its focal point to the centre. The control SHALL NOT be offered for logos, the favicon and the site logo, which are always shown whole, or where the image can't be replaced.

#### Scenario: Keep a face in view
- **WHEN** the owner selects a hero image in the "Full photo" look and clicks near the top of the focal point view
- **THEN** the canvas shows the top part of the photo, the image node's vertical position is about 15, and one undo restores the centre

#### Scenario: Arrow keys
- **WHEN** the focal point is 50, 50 and the owner presses Shift and the left arrow twice, then the up arrow once
- **THEN** the focal point is 30, 49, and one undo returns it to 50, 50

#### Scenario: Reset
- **WHEN** the owner uses "Centre" on an image whose focal point is 20, 70
- **THEN** the focal point is 50, 50

#### Scenario: No focal point for logos
- **WHEN** the owner selects a logo of a partner logos block
- **THEN** the Image panel offers no focal point control
