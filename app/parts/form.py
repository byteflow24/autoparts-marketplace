from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired

"""
Forms for managing parts and garage inventory.
"""

class PartForm(FlaskForm):
    part_number = StringField("Part Number", validators=[DataRequired()])
    name = StringField("Name", validators=[DataRequired()])
    brand = StringField("Brand", validators=[DataRequired()])
    category = StringField("Category", validators=[DataRequired()])
    submit = SubmitField("Add Part")


class GarageForm(FlaskForm):
    name = StringField("Garage Name", validators=[DataRequired()])
    location = StringField("Location", validators=[DataRequired()])
    submit = SubmitField("Create Garage")
