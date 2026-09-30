import type { Component } from "svelte";
import { createCommandsAndKeymap } from "./commands";
import ExternalLink from "./nodes/ExternalLink.svelte";
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
import Page from "./nodes/Page.svelte";
import PageLink from "./nodes/PageLink.svelte";
import Paragraph from "./nodes/Paragraph.svelte";
import Person from "./nodes/Person.svelte";
import RichText from "./nodes/RichText.svelte";
import ServiceItem from "./nodes/ServiceItem.svelte";
import Services from "./nodes/Services.svelte";
import Site from "./nodes/Site.svelte";
import Subheading from "./nodes/Subheading.svelte";
import Team from "./nodes/Team.svelte";
import TextWithImage from "./nodes/TextWithImage.svelte";
import {
  insertListItem,
  insertParagraph,
  insertPerson,
  insertRichText,
  insertServiceItem,
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
  image: Image,
  strong: MarkStrong,
  emphasis: MarkEmphasis,
  link: MarkLink,
  internal_link: MarkLink,
};

/** Svedit session config for the site editor. */
export function createConfig() {
  return {
    generate_id: () => `n${crypto.randomUUID()}`,
    node_components: nodeComponents,
    // Default node types of each node_array (Enter at the end of a text, or typing in a gap).
    inserters: {
      paragraph: insertParagraph,
      list_item: insertListItem,
      service_item: insertServiceItem,
      // Gallery photos and logos need an image, so they only come from the library.
      person: insertPerson,
      rich_text: insertRichText,
    },
    create_commands_and_keymap: createCommandsAndKeymap,
  };
}
