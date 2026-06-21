-- Wire Stripe Price IDs to packages so checkout sessions can be created.

update packages set stripe_price_id = 'price_1TkpI8Gsedg8MJh9IMwIoWUa' where slug = 'parent';
update packages set stripe_price_id = 'price_1TkpMkGsedg8MJh9McBPm7MT' where slug = 'school-tier-1';
update packages set stripe_price_id = 'price_1TkpNcGsedg8MJh9oMiS6DOj' where slug = 'school-tier-2';
update packages set stripe_price_id = 'price_1TkpO8Gsedg8MJh9Aa6kzhDu' where slug = 'school-tier-3';
update packages set stripe_price_id = 'price_1TkpRqGsedg8MJh9bCutZZUy' where slug = 'expansion-5';
