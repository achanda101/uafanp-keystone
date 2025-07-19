// schema.ts
import 'dotenv/config'

import { list, group } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import {
  text,
  relationship,
  password,
  timestamp,
  select,
  virtual
} from '@keystone-6/core/fields';
import { cloudinaryImage } from '@keystone-6/cloudinary'
import { graphql } from '@keystone-6/core';
import { document } from '@keystone-6/fields-document'
import { type Lists } from '.keystone/types'

// Validate environment variables before creating config
const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(`Missing Cloudinary environment variables:
    CLOUDINARY_CLOUD_NAME: ${cloudName ? 'SET' : 'MISSING'}
    CLOUDINARY_API_KEY: ${apiKey ? 'SET' : 'MISSING'}
    CLOUDINARY_API_SECRET: ${apiSecret ? 'SET' : 'MISSING'}
  `)
}

// Create Cloudinary configuration object
const cloudinaryConfig = {
  cloudName,
  apiKey,
  apiSecret,
  folder: 'banners',
}

export const lists = {
  HomePage: list({
    isSingleton: true,
    access: allowAll,
    fields: {
      title: text({
        validation: { isRequired: true },
        ui: {
          description: 'Title of Page',
        },
      }),
      ...group({
        label: "Hero Section",
        description: "Details for Hero Section",
        fields: ({
          heroHeading: text({
            ui: {
              description: 'Heading for Hero section',
            },
          }),

          heroSubheading: text({
            ui: {
              displayMode: 'textarea',
              description: 'Subheading for Hero section',
            },
          }),

          ctaButtonText: text({
            label: 'CTA Button Text',
            validation: { isRequired: true },
            ui: {
              description: 'Text displayed on the call-to-action button',
            },
          }),

          ctaButtonUrl: text({
            label: 'CTA Button URL',
            validation: {
              isRequired: true,
              length: { max: 2000 },
            },
            hooks: {
              resolveInput: async ({ resolvedData }) => {
                let url = resolvedData.ctaButtonUrl;
                if (url && !url.startsWith('http') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
                  url = `https://${url}`;
                }
                return url;
              },
              validateInput: async ({ resolvedData, addValidationError }) => {
                const url = resolvedData.ctaButtonUrl;
                if (url) {
                  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
                    return;
                  }

                  try {
                    new URL(url);
                  } catch {
                    addValidationError('Please enter a valid URL');
                  }
                }
              },
            },
            ui: {
              description: 'URL for the button. Supports: https://example.com, /internal-page, mailto:user@example.com, tel:+1234567890, #section',
            },
          }),
        }),
      }),
      grantCardsQuickView: virtual({
        field: graphql.field({
          type: graphql.String,
          async resolve(item, args, context) {
            const grantTypes = await context.query.GrantType.findMany({
              query: 'title isDisplayed grantAmount availability'
            });

            if (!grantTypes || grantTypes.length === 0) {
              return 'No grants created yet.';
            }

            const lines = [
              ...grantTypes.map(grant => {
                const status = grant.isDisplayed === 'visible' ? 'VISIBLE' : 'HIDDEN';
                return `${status} ${grant.title} - ${grant.grantAmount} (${grant.availability})`;
              })
            ];
            return lines.join(' || ');

          }
        }),
        ui: {
          createView: { fieldMode: 'hidden' },
          itemView: {
            fieldMode: 'read',
            displayMode: 'textarea'
          },
          listView: { fieldMode: 'hidden' },
        }
      }),
      toPublish: select({
        options: [
          { label: 'Published', value: 'published' },
          { label: 'Draft', value: 'draft' },
        ],
        defaultValue: 'draft',
        ui: {
          description: 'Set to Published to display this page on the website',
        },
      }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: 'now' },
        db: { updatedAt: true },
      }),
    },
    ui: {
      labelField: 'title',
      listView: {
        initialColumns: [ 'title', 'updatedAt' ],
        initialSort: {
          field: 'updatedAt',
          direction: 'DESC'
        }
      },
    },
  }),

  GrantType: list({
    access: allowAll,
    fields: {
      title: text({ validation: { isRequired: true } }),
      slug: text({
        validation: { isRequired: true },
        isIndexed: 'unique',
        ui: {
          description: "This will be the URL of the grant page."
        }
      }),
      ...group({
        label: "Grant Card Details",
        fields: {
          description: text({
            validation: { isRequired: true },
            ui: {
              displayMode: 'textarea',
              description: "Brief summary for the grant card which will appear on the Homepage and the Grants landing page."
            }
          }),
          grantAmount: text({ validation: { isRequired: true } }),
          timeFrame: text({
            validation: { isRequired: true },
            ui: {
              description: "Usage Timeframe."
            }
          }),
          availability: text({ validation: { isRequired: true } }),
          commonUses: text({
            validation: { isRequired: true },
            ui: {
              displayMode: 'textarea',
              description: "List the common uses for this grant. They will be displayed on the Grant Card."
            }
          }),
          badgeText: text({ validation: { isRequired: true } }),
          badgeColor: select({
            options: [
              { label: 'Turmeric', value: 'grant-turmeric' },
              { label: 'Urgent Red', value: 'grant-urgent' },
            ],
            defaultValue: 'grant-turmeric',
          }),
          backgroundColor: select({
            options: [
              { label: 'Light Sky Blue', value: 'light-sky' },
              { label: 'Light Forest Green', value: 'light-forest' },
              { label: 'Light Turmeric', value: 'turmeric-light' },
            ],
            defaultValue: 'light-sky',
          }),
        }
      }),
      grantPurpose: text({
        validation: { isRequired: true },
        ui: {
          displayMode: 'textarea',
          description: "Detailed description of this grant's purpose and goals. This content appears on the dedicated grant page and helps defenders determine if they should apply."
        }
      }),
      isDisplayed: select({
        options: [
          { label: 'Visible', value: 'visible' },
          { label: 'Hidden', value: 'hidden' },
        ],
        defaultValue: 'visible',
        ui: {
          description: "If visible, the Grant Card will appear on the Homepage and a dedicated grant page will be published."
        }
      }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: 'now' },
        db: { updatedAt: true },
      }),
    },
    ui: {
      labelField: 'title',
      listView: {
        initialColumns: [ 'title', 'isDisplayed', 'updatedAt' ],
        initialSort: {
          field: 'updatedAt',
          direction: 'DESC'
        }
      },
    },
  }),

  Page: list({
    access: allowAll,
    fields: {
      title: text({
        validation: { isRequired: true },
        ui: {
          description: 'Title of Page',
        },
      }),
      ...group({
        label: "Hero Section",
        description: "Details for Hero Section",
        fields: ({
          heroHeading: text({
            ui: {
              description: 'Heading for Hero section',
            },
          }),

          heroSubheading: text({
            ui: {
              displayMode: 'textarea',
              description: 'Subheading for Hero section',
            },
          }),

          ctaButtonText: text({
            label: 'CTA Button Text',
            validation: { isRequired: true },
            ui: {
              description: 'Text displayed on the call-to-action button',
            },
          }),

          ctaButtonUrl: text({
            label: 'CTA Button URL',
            validation: {
              isRequired: true,
              length: { max: 2000 },
            },
            hooks: {
              resolveInput: async ({ resolvedData }) => {
                let url = resolvedData.ctaButtonUrl;
                if (url && !url.startsWith('http') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
                  url = `https://${url}`;
                }
                return url;
              },
              validateInput: async ({ resolvedData, addValidationError }) => {
                const url = resolvedData.ctaButtonUrl;
                if (url) {
                  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
                    return;
                  }

                  try {
                    new URL(url);
                  } catch {
                    addValidationError('Please enter a valid URL');
                  }
                }
              },
            },
            ui: {
              description: 'URL for the button. Supports: https://example.com, /internal-page, mailto:user@example.com, tel:+1234567890, #section',
            },
          }),
        }),
      }),

      slug: text({
        validation: { isRequired: true },
        isIndexed: 'unique',
        ui: {
          description: 'URL-friendly version of the title (e.g., about-us)',
        },
      }),

      toPublish: select({
        options: [
          { label: 'Published', value: 'published' },
          { label: 'Draft', value: 'draft' },
        ],
        defaultValue: 'draft',
        ui: {
          description: 'Set to Published to display this page on the website',
        },
      }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: 'now' },
        db: { updatedAt: true },
      }),
    },
    ui: {
      labelField: 'title',
      listView: {
        initialColumns: [ 'title', 'updatedAt' ],
        initialSort: {
          field: 'updatedAt',
          direction: 'DESC'
        }
      },
    },
  }),

  Post: list({
    access: allowAll,
    fields: {
      title: text({
        validation: { isRequired: true },
        ui: {
          description: 'Title of Post',
        },
      }),

      banner: cloudinaryImage({
        cloudinary: cloudinaryConfig,
        ui: {
          description: 'Upload a banner image for this post',
        },
      }),

      content: document({
        formatting: true,
        layouts: [
          [ 1, 1 ],
          [ 1, 1, 1 ],
          [ 2, 1 ],
          [ 1, 2 ],
          [ 1, 2, 1 ],
        ],
        links: true,
        dividers: true,
      }),

      author: relationship({
        ref: 'User.posts',
        ui: {
          displayMode: 'cards',
          cardFields: [ 'name', 'email' ],
          inlineEdit: { fields: [ 'name', 'email' ] },
          linkToItem: true,
          inlineConnect: true,
        },
        many: false,
      }),

      tags: relationship({
        ref: 'Tag.posts',
        many: true,
        ui: {
          displayMode: 'cards',
          cardFields: [ 'name' ],
          inlineEdit: { fields: [ 'name' ] },
          linkToItem: true,
          inlineConnect: true,
          inlineCreate: { fields: [ 'name' ] },
        },
      }),

      slug: text({
        validation: { isRequired: true },
        isIndexed: 'unique',
        ui: {
          description: 'URL-friendly version of the title (e.g., about-us)',
        },
      }),

      toPublish: select({
        options: [
          { label: 'Published', value: 'published' },
          { label: 'Draft', value: 'draft' },
        ],
        defaultValue: 'draft',
        ui: {
          description: 'Set to Published to display this page on the website',
        },
      }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: 'now' },
        db: { updatedAt: true },
      }),
    },
    ui: {
      labelField: 'title',
      listView: {
        initialColumns: [ 'title', 'updatedAt' ],
        initialSort: {
          field: 'updatedAt',
          direction: 'DESC'
        }
      },
    },
  }),

  User: list({
    access: allowAll,
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({
        validation: { isRequired: true },
        isIndexed: 'unique',
      }),
      password: password({ validation: { isRequired: true } }),
      posts: relationship({ ref: 'Post.author', many: true }),
      createdAt: timestamp({
        defaultValue: { kind: 'now' },
      }),
    },
  }),

  Tag: list({
    access: allowAll,
    ui: {
      isHidden: true,
    },
    fields: {
      name: text(),
      posts: relationship({ ref: 'Post.tags', many: true }),
    },
  }),
} satisfies Lists