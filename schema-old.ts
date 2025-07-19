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

// Debug Cloudinary configuration
console.log('🔍 Schema Cloudinary Config Check:')
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME)
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY)
console.log('CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET)

// Cloudinary configuration object
const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  apiKey: process.env.CLOUDINARY_API_KEY!,
  apiSecret: process.env.CLOUDINARY_API_SECRET!,
  folder: 'banners',
}

console.log('📁 Cloudinary config object:', {
  ...cloudinaryConfig,
  apiSecret: '***HIDDEN***'
})

// Debug access function
const debugAccess = (operation: string) => {
  return ({ session, context, listKey, fieldKey }: any) => {
    console.log(`🔍 Access check - Operation: ${operation}, List: ${listKey}, Field: ${fieldKey || 'N/A'}`)
    console.log(`👤 Session:`, session ? {
      id: session.itemId,
      name: session.data?.name
    } : 'No session')

    // Always allow for debugging
    return true
  }
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
                  // Allow relative URLs, mailto, tel
                  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
                    return;
                  }

                  // Validate absolute URLs
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
                const status = grant.isActive === 'visible' ? 'VISIBLE' : 'HIDDEN';
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
      // Meta fields
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
        // this sets the timestamp to Date.now() when the user is first created
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
        initialColumns: [ 'title', 'isActive', 'updatedAt' ],
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
                  // Allow relative URLs, mailto, tel
                  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
                    return;
                  }

                  // Validate absolute URLs
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

      // Meta fields
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
        // this sets the timestamp to Date.now() when the user is first created
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
    },
    ui: {
      labelField: 'title',
      listView: {
        initialColumns: [ 'title', 'author', 'createdAt' ],
        initialSort: {
          field: 'createdAt',
          direction: 'DESC'
        }
      },
      itemView: {
        defaultFieldMode: 'edit',
      },
    },
  }),

  User: list({
    // WARNING
    //   for this starter project, anyone can create, query, update and delete anything
    //   if you want to prevent random people on the internet from accessing your data,
    //   you can find out more at https://keystonejs.com/docs/guides/auth-and-access-control
    access: allowAll,

    // this is the fields for our User list
    fields: {
      // by adding isRequired, we enforce that every User should have a name
      //   if no name is provided, an error will be displayed
      name: text({ validation: { isRequired: true } }),

      email: text({
        validation: { isRequired: true },
        // by adding isIndexed: 'unique', we're saying that no user can have the same
        // email as another user - this may or may not be a good idea for your project
        isIndexed: 'unique',
      }),

      password: password({ validation: { isRequired: true } }),

      // we can use this field to see what Posts this User has authored
      //   more on that in the Post list below
      posts: relationship({ ref: 'Post.author', many: true }),

      createdAt: timestamp({
        // this sets the timestamp to Date.now() when the user is first created
        defaultValue: { kind: 'now' },
      }),
    },
  }),

  // this last list is our Tag list, it only has a name field for now
  Tag: list({
    // WARNING
    //   for this starter project, anyone can create, query, update and delete anything
    //   if you want to prevent random people on the internet from accessing your data,
    //   you can find out more at https://keystonejs.com/docs/guides/auth-and-access-control
    access: allowAll,

    // setting this to isHidden for the user interface prevents this list being visible in the Admin UI
    ui: {
      isHidden: true,
    },

    // this is the fields for our Tag list
    fields: {
      name: text(),
      // this can be helpful to find out all the Posts associated with a Tag
      posts: relationship({ ref: 'Post.tags', many: true }),
    },
  }),
} satisfies Lists
