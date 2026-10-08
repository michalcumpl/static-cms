import type { Component } from "svelte";
import { createCommandsAndKeymap } from "./commands";
import FormCategory from "./form/FormCategory.svelte";
import FormFact from "./form/FormFact.svelte";
import FormPerson from "./form/FormPerson.svelte";
import FormPhoto from "./form/FormPhoto.svelte";
import FormProject from "./form/FormProject.svelte";
import FormQuestion from "./form/FormQuestion.svelte";
import FormService from "./form/FormService.svelte";
import FormSite from "./form/FormSite.svelte";
import FormTestimonial from "./form/FormTestimonial.svelte";
import CallToAction from "./nodes/CallToAction.svelte";
import Contact from "./nodes/Contact.svelte";
import ExternalLink from "./nodes/ExternalLink.svelte";
import Faq from "./nodes/Faq.svelte";
import FaqItem from "./nodes/FaqItem.svelte";
import Figure from "./nodes/Figure.svelte";
import Figures from "./nodes/Figures.svelte";
import Gallery from "./nodes/Gallery.svelte";
import GalleryItem from "./nodes/GalleryItem.svelte";
import Hero from "./nodes/Hero.svelte";
import Image from "./nodes/Image.svelte";
import List from "./nodes/List.svelte";
import ListItem from "./nodes/ListItem.svelte";
import LogoItem from "./nodes/LogoItem.svelte";
import Logos from "./nodes/Logos.svelte";
import MarkEmphasis from "./nodes/MarkEmphasis.svelte";
import MarkLink from "./nodes/MarkLink.svelte";
import MarkStrong from "./nodes/MarkStrong.svelte";
import Nav from "./nodes/Nav.svelte";
import OpeningHours from "./nodes/OpeningHours.svelte";
import Page from "./nodes/Page.svelte";
import PageLink from "./nodes/PageLink.svelte";
import Paragraph from "./nodes/Paragraph.svelte";
import Person from "./nodes/Person.svelte";
import Projects from "./nodes/Projects.svelte";
import ProjectTile from "./nodes/ProjectTile.svelte";
import RichText from "./nodes/RichText.svelte";
import ServiceItem from "./nodes/ServiceItem.svelte";
import Services from "./nodes/Services.svelte";
import Site from "./nodes/Site.svelte";
import Step from "./nodes/Step.svelte";
import Steps from "./nodes/Steps.svelte";
import Subheading from "./nodes/Subheading.svelte";
import Team from "./nodes/Team.svelte";
import Testimonial from "./nodes/Testimonial.svelte";
import Testimonials from "./nodes/Testimonials.svelte";
import TextWithImage from "./nodes/TextWithImage.svelte";
import {
  insertFact,
  insertFaqItem,
  insertFigure,
  insertListItem,
  insertParagraph,
  insertPerson,
  insertRichText,
  insertServiceItem,
  insertStep,
  insertTestimonial,
} from "./transforms";

// biome-ignore lint/suspicious/noExplicitAny: node components take Svedit's path props.
export const nodeComponents: Record<string, Component<any>> = {
  site: Site,
  nav: Nav,
  page_link: PageLink,
  external_link: ExternalLink,
  page: Page,
  hero: Hero,
  rich_text: RichText,
  paragraph: Paragraph,
  subheading: Subheading,
  list: List,
  list_item: ListItem,
  services: Services,
  service_item: ServiceItem,
  text_with_image: TextWithImage,
  gallery: Gallery,
  gallery_item: GalleryItem,
  team: Team,
  person: Person,
  logos: Logos,
  logo_item: LogoItem,
  contact: Contact,
  opening_hours: OpeningHours,
  call_to_action: CallToAction,
  testimonials: Testimonials,
  testimonial: Testimonial,
  faq: Faq,
  faq_item: FaqItem,
  figures: Figures,
  figure: Figure,
  steps: Steps,
  step: Step,
  projects: Projects,
  project: ProjectTile,
  image: Image,
  strong: MarkStrong,
  emphasis: MarkEmphasis,
  link: MarkLink,
  internal_link: MarkLink,
};

/**
 * What the session renders: the page canvas, or the panel's list forms, which render the site
 * as the section's lists and the items as labelled fields (offer-and-about decision 2).
 */
export type EditorView = "canvas" | "form";

// biome-ignore lint/suspicious/noExplicitAny: node components take Svedit's path props.
const formComponents: Record<string, Component<any>> = {
  ...nodeComponents,
  site: FormSite,
  service_item: FormService,
  faq_item: FormQuestion,
  person: FormPerson,
  testimonial: FormTestimonial,
  project: FormProject,
  project_category: FormCategory,
  fact: FormFact,
  // In the forms, gallery items are only a project's photos.
  gallery_item: FormPhoto,
};

/** Svedit session config for the site editor, or for the panel's list forms. */
export function createConfig(view: EditorView = "canvas") {
  return {
    generate_id: () => `n${crypto.randomUUID()}`,
    node_components: view === "form" ? formComponents : nodeComponents,
    // Default node types of each node_array (Enter at the end of a text, or typing in a gap).
    inserters: {
      paragraph: insertParagraph,
      list_item: insertListItem,
      service_item: insertServiceItem,
      // Gallery photos and logos need an image, so they only come from the library.
      person: insertPerson,
      testimonial: insertTestimonial,
      faq_item: insertFaqItem,
      figure: insertFigure,
      fact: insertFact,
      step: insertStep,
      rich_text: insertRichText,
    },
    create_commands_and_keymap: createCommandsAndKeymap,
  };
}
